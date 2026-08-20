// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    std::panic::set_hook(Box::new(|info| {
        let message = format!("[panic] {info}\n");
        let path = std::env::temp_dir().join("tauri-react-python-template-panic.log");
        let _ = std::fs::write(path, message);
    }));

    app_lib::run();
}
