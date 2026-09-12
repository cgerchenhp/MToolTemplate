use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Mutex, OnceLock};
use std::time::Duration;
use tauri::menu::{Menu, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
#[cfg(not(debug_assertions))]
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

#[cfg(not(debug_assertions))]
fn write_startup_error(msg: &str) {
    let path = std::env::temp_dir().join("tauri-react-python-template-startup.log");
    let _ = std::fs::write(path, msg);
}

pub struct BackendChild {
    child: Mutex<Option<CommandChild>>,
    terminated: Mutex<Option<mpsc::Receiver<()>>>,
    exit_started: AtomicBool,
    #[cfg(target_os = "windows")]
    job: Mutex<Option<BackendProcessJob>>,
}

pub struct BackendPort(pub Mutex<Option<String>>);

/// Own the packaged backend and every process it creates on Windows.
/// Closing this Job Object is the final fallback when graceful shutdown fails
/// or the native App process is terminated unexpectedly.
#[cfg(target_os = "windows")]
#[derive(Debug)]
struct BackendProcessJob {
    handle: usize,
}

#[cfg(all(target_os = "windows", any(test, not(debug_assertions))))]
impl BackendProcessJob {
    fn assign(process_id: u32) -> Result<Self, String> {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::JobObjects::{
            AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
            SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
            JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
        };
        use windows_sys::Win32::System::Threading::{
            OpenProcess, PROCESS_SET_QUOTA, PROCESS_TERMINATE,
        };

        unsafe {
            let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
            if job.is_null() {
                return Err(format!(
                    "Unable to create the backend process job: {}",
                    std::io::Error::last_os_error()
                ));
            }

            let mut limits = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
            limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            if SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                std::ptr::addr_of!(limits).cast(),
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            ) == 0
            {
                let error = std::io::Error::last_os_error();
                let _ = CloseHandle(job);
                return Err(format!(
                    "Unable to configure the backend process job: {error}"
                ));
            }

            let process = OpenProcess(PROCESS_SET_QUOTA | PROCESS_TERMINATE, 0, process_id);
            if process.is_null() {
                let error = std::io::Error::last_os_error();
                let _ = CloseHandle(job);
                return Err(format!(
                    "Unable to open backend process {process_id} for job assignment: {error}"
                ));
            }

            if AssignProcessToJobObject(job, process) == 0 {
                let error = std::io::Error::last_os_error();
                let _ = CloseHandle(process);
                let _ = CloseHandle(job);
                return Err(format!(
                    "Unable to assign backend process {process_id} to its job: {error}"
                ));
            }

            let _ = CloseHandle(process);
            Ok(Self {
                handle: job as usize,
            })
        }
    }
}

#[cfg(target_os = "windows")]
impl Drop for BackendProcessJob {
    fn drop(&mut self) {
        use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};

        unsafe {
            let _ = CloseHandle(self.handle as HANDLE);
        }
    }
}

#[cfg(all(not(debug_assertions), target_os = "windows"))]
const BACKEND_SIDECAR_PATH: &str = "_internal/backend";
#[cfg(all(not(debug_assertions), not(target_os = "windows")))]
const BACKEND_SIDECAR_PATH: &str = "backend";

const BACKEND_SHUTDOWN_COMMAND: &[u8] = b"shutdown\n";
const BACKEND_SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(15);
const MAIN_TRAY_ID: &str = "main-tray";

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectBehaviorConfig {
    #[serde(default)]
    close_to_tray: bool,
}

fn close_to_tray_enabled() -> bool {
    static ENABLED: OnceLock<bool> = OnceLock::new();
    *ENABLED.get_or_init(|| {
        match serde_json::from_str::<ProjectBehaviorConfig>(include_str!(
            "../../project.config.json"
        )) {
            Ok(config) => config.close_to_tray,
            Err(error) => {
                log::error!("Unable to read closeToTray from project.config.json: {error}");
                false
            }
        }
    })
}

fn set_main_tray_visible(app: &tauri::AppHandle, visible: bool) {
    if let Some(tray) = app.tray_by_id(MAIN_TRAY_ID) {
        if let Err(error) = tray.set_visible(visible) {
            log::warn!("Unable to update the main tray icon visibility: {error}");
        }
    }
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.show() {
            log::warn!("Unable to show the main window: {error}");
            return;
        }
        let _ = window.unminimize();
        let _ = window.set_focus();
        set_main_tray_visible(app, false);
    }
}

fn hide_main_window_to_tray(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        set_main_tray_visible(app, true);
        if let Err(error) = window.hide() {
            log::warn!("Unable to hide the main window: {error}");
            set_main_tray_visible(app, false);
        }
    }
}

fn hide_main_window_for_exit(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.hide() {
            log::warn!("Unable to hide the main window while exiting: {error}");
        }
    }
}

fn stop_backend(app: &tauri::AppHandle) {
    let started_at = std::time::Instant::now();
    let state = app.state::<BackendChild>();
    #[cfg(target_os = "windows")]
    let backend_job = state.job.lock().unwrap().take();
    let child = state.child.lock().unwrap().take();
    let terminated = state.terminated.lock().unwrap().take();

    if let Some(mut child) = child {
        let pid = child.pid();
        let shutdown_requested = match child.write(BACKEND_SHUTDOWN_COMMAND) {
            Ok(()) => true,
            Err(error) => {
                log::warn!("Unable to request graceful backend shutdown: {error}");
                false
            }
        };
        let exited = shutdown_requested
            && terminated
                .is_some_and(|receiver| receiver.recv_timeout(BACKEND_SHUTDOWN_TIMEOUT).is_ok());
        if !exited {
            log::warn!("Backend did not exit gracefully; terminating process {pid}");
            let _ = child.kill();
        }
        log::info!(
            "Backend shutdown cleanup finished in {:.2?}",
            started_at.elapsed()
        );
    }

    // Closing the Job Object terminates any remaining descendants that
    // outlived the backend's graceful shutdown path.
    #[cfg(target_os = "windows")]
    drop(backend_job);
}

fn stop_backend_and_exit(app: &tauri::AppHandle) {
    if app
        .state::<BackendChild>()
        .exit_started
        .swap(true, Ordering::SeqCst)
    {
        return;
    }

    hide_main_window_for_exit(app);
    let app_handle = app.clone();
    std::thread::spawn(move || {
        stop_backend(&app_handle);
        app_handle.exit(0);
    });
}

fn install_main_tray(app: &tauri::App) -> tauri::Result<()> {
    let app_name = app.package_info().name.clone();
    let show_item = MenuItemBuilder::with_id("show", format!("打开 {app_name}")).build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "退出并停止后台服务").build(app)?;
    let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;
    let mut tray_builder = TrayIconBuilder::with_id(MAIN_TRAY_ID)
        .menu(&tray_menu)
        .tooltip(app_name)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            if event.id() == "show" {
                show_main_window(app);
            } else if event.id() == "quit" {
                stop_backend_and_exit(app);
            }
        })
        .on_tray_icon_event(|tray, event| {
            let should_show = matches!(
                event,
                TrayIconEvent::DoubleClick {
                    button: MouseButton::Left,
                    ..
                } | TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            );
            if should_show {
                show_main_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
    }
    let tray = tray_builder.build(app)?;
    tray.set_visible(false)?;
    Ok(())
}

#[cfg(debug_assertions)]
fn dev_project_key() -> String {
    let raw = std::env::var("TAURI_DEV_PROJECT_KEY")
        .unwrap_or_else(|_| "tauri-react-python-template".to_string());
    let sanitized: String = raw
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '_' || character == '-' {
                character
            } else {
                '-'
            }
        })
        .collect();
    let trimmed = sanitized.trim_matches('-');
    if trimmed.is_empty() {
        "tauri-react-python-template".to_string()
    } else {
        trimmed.to_string()
    }
}

#[cfg(debug_assertions)]
fn read_live_dev_backend_port() -> Option<String> {
    let port_file = std::env::temp_dir().join(format!("{}.backend.port", dev_project_key()));
    let content = std::fs::read_to_string(port_file).ok()?;
    let port = content.trim().parse::<u16>().ok()?;
    if port == 0 {
        return None;
    }

    let address = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    std::net::TcpStream::connect_timeout(&address, std::time::Duration::from_millis(50)).ok()?;
    Some(port.to_string())
}

/// Restore the executable icon after the native WebView window is created.
/// This avoids Windows showing the generic WebView icon in the taskbar.
#[cfg(target_os = "windows")]
fn set_windows_taskbar_icon(window: &tauri::WebviewWindow) {
    use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        LoadImageW, SendMessageW, ICON_BIG, ICON_SMALL, IMAGE_ICON, LR_DEFAULTCOLOR, WM_SETICON,
    };

    // `tauri-build` assigns the bundle ICO to the executable's primary group.
    const PRIMARY_ICON_RESOURCE_ID: u16 = 32512;

    let hwnd = match window.hwnd() {
        Ok(hwnd) => hwnd,
        Err(error) => {
            log::warn!("Unable to obtain the main window handle for its taskbar icon: {error}");
            return;
        }
    };

    unsafe {
        let module = GetModuleHandleW(std::ptr::null());
        let resource = PRIMARY_ICON_RESOURCE_ID as usize as *const u16;
        let large_icon = LoadImageW(module, resource, IMAGE_ICON, 256, 256, LR_DEFAULTCOLOR);
        if large_icon.is_null() {
            log::warn!("Unable to load the embedded 256px application icon for the taskbar");
            return;
        }

        let _ = SendMessageW(hwnd.0, WM_SETICON, ICON_BIG as usize, large_icon as isize);

        let small_icon = LoadImageW(module, resource, IMAGE_ICON, 32, 32, LR_DEFAULTCOLOR);
        if !small_icon.is_null() {
            let _ = SendMessageW(hwnd.0, WM_SETICON, ICON_SMALL as usize, small_icon as isize);
        }
    }
}

/// Payload for `backend:log` events forwarded to the frontend.
#[cfg(not(debug_assertions))]
#[derive(serde::Serialize, Clone)]
struct BackendLogLine {
    /// "stdout" or "stderr"
    stream: &'static str,
    text: String,
}

/// 轮询间隔 50 ms：后端通常 < 500 ms 就绪，粗间隔会直接造成连接显示延迟。
#[tauri::command]
async fn get_backend_port(state: tauri::State<'_, BackendPort>) -> Result<String, String> {
    for _ in 0..600 {
        {
            let guard = state.0.lock().unwrap();
            if let Some(port) = guard.as_deref() {
                return Ok(port.to_string());
            }
        }
        #[cfg(debug_assertions)]
        if let Some(port) = read_live_dev_backend_port() {
            *state.0.lock().unwrap() = Some(port.clone());
            log::info!("Dev backend ready on port {port}");
            return Ok(port);
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }
    Err("Backend did not start within 30 seconds".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir { file_name: None },
                ))
                .build(),
        )
        .manage(BackendChild {
            child: Mutex::new(None),
            terminated: Mutex::new(None),
            exit_started: AtomicBool::new(false),
            #[cfg(target_os = "windows")]
            job: Mutex::new(None),
        })
        .manage(BackendPort(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![get_backend_port])
        .setup(|app| {
            // The main window is created by Tauri from the shared window
            // configuration before setup runs. Reusing it here avoids a
            // second native window construction during macOS launch.
            let window = app
                .get_webview_window("main")
                .ok_or("Main window configuration is missing")?;

            #[cfg(debug_assertions)]
            {
                let title = format!("{} [DEV]", app.package_info().name);
                window.set_title(&title).map_err(|e| e.to_string())?;
            }

            #[cfg(target_os = "windows")]
            set_windows_taskbar_icon(&window);

            if close_to_tray_enabled() {
                install_main_tray(app)?;
            }

            // 生产模式：自动启动打包好的 Python sidecar，从 stdout 读取端口
            #[cfg(not(debug_assertions))]
            {
                let sidecar = match app.shell().sidecar(BACKEND_SIDECAR_PATH) {
                    Ok(s) => s,
                    Err(e) => {
                        let msg = format!(
                            "[sidecar] 找不到 backend 二进制: {e}\nWindows 请确认发布目录中的 _internal/backend.exe 存在；macOS 请确认 backend sidecar 已打包。"
                        );
                        write_startup_error(&msg);
                        log::error!("{msg}");
                        return Err(msg.into());
                    }
                };
                let (mut rx, child) = match sidecar.spawn() {
                    Ok(pair) => pair,
                    Err(e) => {
                        let msg = format!("[sidecar] 启动 backend 失败: {e}");
                        write_startup_error(&msg);
                        log::error!("{msg}");
                        return Err(msg.into());
                    }
                };

                #[cfg(target_os = "windows")]
                let backend_job = match BackendProcessJob::assign(child.pid()) {
                    Ok(job) => {
                        log::info!(
                            "Backend process {} assigned to the App lifetime job",
                            child.pid()
                        );
                        job
                    }
                    Err(error) => {
                        let msg = format!("[sidecar] 无法把 backend 纳入 App 进程组: {error}");
                        let _ = child.kill();
                        write_startup_error(&msg);
                        log::error!("{msg}");
                        return Err(msg.into());
                    }
                };

                let (terminated_tx, terminated_rx) = mpsc::channel();
                let backend_state = app.state::<BackendChild>();
                *backend_state.child.lock().unwrap() = Some(child);
                *backend_state.terminated.lock().unwrap() = Some(terminated_rx);
                #[cfg(target_os = "windows")]
                {
                    *backend_state.job.lock().unwrap() = Some(backend_job);
                }

                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    let mut port_detected = false;
                    while let Some(event) = rx.recv().await {
                        match event {
                            CommandEvent::Stdout(line) => {
                                let raw = String::from_utf8_lossy(&line);
                                let text = raw.trim();
                                if text.is_empty() {
                                    continue;
                                }
                                // Detect port announcement; don't forward it as a log line.
                                if !port_detected {
                                    if let Some(port_str) = text.strip_prefix("BACKEND_PORT:") {
                                        let port = port_str.trim().to_string();
                                        log::info!("Backend ready on port {port}");
                                        *app_handle.state::<BackendPort>().0.lock().unwrap() =
                                            Some(port);
                                        port_detected = true;
                                        continue;
                                    }
                                }
                                log::info!("backend: {text}");
                                let _ = app_handle.emit("backend:log", BackendLogLine {
                                    stream: "stdout",
                                    text: text.to_string(),
                                });
                            }
                            CommandEvent::Stderr(line) => {
                                let raw = String::from_utf8_lossy(&line);
                                let text = raw.trim();
                                if text.is_empty() {
                                    continue;
                                }
                                log::warn!("backend: {text}");
                                let _ = app_handle.emit("backend:log", BackendLogLine {
                                    stream: "stderr",
                                    text: text.to_string(),
                                });
                            }
                            CommandEvent::Terminated(payload) => {
                                log::info!(
                                    "Backend exited: code={:?}, signal={:?}",
                                    payload.code,
                                    payload.signal
                                );
                                #[cfg(target_os = "windows")]
                                drop(
                                    app_handle
                                        .state::<BackendChild>()
                                        .job
                                        .lock()
                                        .unwrap()
                                        .take(),
                                );
                                let _ = terminated_tx.send(());
                            }
                            _ => {}
                        }
                    }
                });
            }
            // 开发模式：get_backend_port 按需读取端口文件并验证后端仍在监听。
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                api.prevent_close();
                if close_to_tray_enabled() {
                    hide_main_window_to_tray(window.app_handle());
                } else {
                    stop_backend_and_exit(window.app_handle());
                }
            }
            tauri::WindowEvent::Destroyed => {
                let exit_started = window
                    .app_handle()
                    .state::<BackendChild>()
                    .exit_started
                    .load(Ordering::SeqCst);
                if !exit_started {
                    stop_backend(window.app_handle());
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use super::BackendProcessJob;
    use std::os::windows::process::CommandExt;
    use std::process::{Command, Stdio};

    #[test]
    fn closing_backend_job_terminates_its_process_group() {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let mut process = Command::new("ping.exe")
            .args(["-n", "30", "127.0.0.1"])
            .creation_flags(CREATE_NO_WINDOW)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("failed to start the process-job test child");
        let job = match BackendProcessJob::assign(process.id()) {
            Ok(job) => job,
            Err(error) => {
                let _ = process.kill();
                panic!("failed to assign the process-job test child: {error}");
            }
        };

        drop(job);
        let deadline = std::time::Instant::now() + std::time::Duration::from_secs(3);
        while std::time::Instant::now() < deadline {
            if process
                .try_wait()
                .expect("failed to query the process-job test child")
                .is_some()
            {
                return;
            }
            std::thread::sleep(std::time::Duration::from_millis(20));
        }

        let _ = process.kill();
        panic!("closing the backend Job Object did not terminate its process group");
    }
}
