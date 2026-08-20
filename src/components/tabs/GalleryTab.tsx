import { useRef, useState } from 'react'

import { FeaturePanel } from '../ui/FeaturePanel'
import { CollapsibleSection } from '../ui/CollapsibleSection'
import { SectionTitle } from '../ui/SectionTitle'
import { FormField } from '../ui/FormField'
import { InfoRow } from '../ui/InfoRow'
import { TextInput } from '../ui/TextInput'
import { TextareaInput } from '../ui/TextareaInput'
import { NumberInput } from '../ui/NumberInput'
import { ColorField } from '../ui/ColorField'
import { NullableColorField } from '../ui/NullableColorField'
import { CheckboxField } from '../ui/CheckboxField'
import { SelectField } from '../ui/SelectField'
import { RadioGroup } from '../ui/RadioGroup'
import { FilePicker } from '../ui/FilePicker'
import { DirPicker } from '../ui/DirPicker'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Alert } from '../ui/Alert'
import { JsonTree } from '../ui/JsonTree'
import { smart_expand_json } from '../ui/jsonTreeUtils'
import { MarkdownView } from '../ui/MarkdownView'
import { FileTree, type FileTreeNode } from '../ui/FileTree'
import { AsyncWaitingNotice } from '../ui/AsyncWaitingNotice'
import { ImageView } from '../ui/ImageView'
import { pixelsToDataUrl } from '../ui/imageUtils'
import { ImageGrid } from '../ui/ImageGrid'
import { MetricCard } from '../ui/MetricCard'
import { FrameStatusBar, type FrameDot } from '../ui/FrameStatusBar'
import { PopoverPanel, WrenchIcon } from '../ui/PopoverPanel'
import { SegmentedTabs } from '../ui/SegmentedTabs'
import { useNotify } from '../../hooks/useNotification'
import { buildRenderedHtmlDocument, downloadHtml } from '../ui/renderedHtmlExport'
import { open as shellOpen } from '@tauri-apps/plugin-shell'

// ── Demo data ────────────────────────────────────────────────────────────────
const DEMO_JSON = {
  name: 'MagicTools',
  version: '0.1.0',
  features: ['icons', 'html-parser', 'image-info'],
  config: {
    backend_port: 8090,
    dark_mode: true,
    locale: 'zh-CN',
    nested: { level1: { level2: { level3: 'deep value' } } },
  },
  tags: ['tool', 'tauri', 'react', 'python'],
}

const DEMO_MD = `## Markdown 示例

这是 **粗体**，这是 *斜体*，这是 \`行内代码\`。

### 列表

- 支持 [链接](https://example.com) 和 **嵌套格式**
- \`marked\` 负责解析，Tailwind prose 负责排版

### 代码块

\`\`\`python
def hello(name: str) -> str:
    return f"Hello, {name}!"
\`\`\`
`

const DEMO_FILE_TREE: FileTreeNode[] = [
  {
    id: 'docs',
    name: 'docs',
    type: 'directory',
    children: [
      { name: 'getting-started.md', type: 'file', path: '/docs/getting-started.md' },
      { name: 'configuration.md', type: 'file', path: '/docs/configuration.md' },
      {
        id: 'guides',
        name: 'guides',
        type: 'directory',
        children: [
          { name: 'build.md', type: 'file', path: '/docs/guides/build.md' },
          { name: 'release.md', type: 'file', path: '/docs/guides/release.md' },
        ],
      },
    ],
  },
  { name: 'README.md', type: 'file', path: '/README.md' },
]

const FRAME_STATUS_SEQUENCE: FrameDot['status'][] = [
  'completed',
  'completed',
  'discarded',
  'completed',
  'failed',
]

const DEMO_FRAMES: FrameDot[] = Array.from({ length: 42 }, (_, index) => ({
  id: 42 - index,
  status: index === 0 ? 'processing' : FRAME_STATUS_SEQUENCE[index % FRAME_STATUS_SEQUENCE.length],
}))

// ── Component ────────────────────────────────────────────────────────────────
export function GalleryTab() {
  // ── 输入控件状态 ──────────────────────────────────────────────
  const [text, setText] = useState('示例文本')
  const [textarea, setTextarea] = useState('第一行\n第二行')
  const [number, setNumber] = useState(42)
  const [color, setColor] = useState('#3B82F6')
  const [nullableColor, setNullableColor] = useState<string | null>(null)
  const [checked, setChecked] = useState(true)
  const [select, setSelect] = useState('png')
  const [processingMode, setProcessingMode] = useState<'fast' | 'balanced' | 'quality'>('balanced')
  const [filePath, setFilePath] = useState('')
  const [dirPath, setDirPath] = useState('')
  const [dropImageSrc, setDropImageSrc] = useState<string | null>(null)
  const [selectedTreePath, setSelectedTreePath] = useState('/docs/getting-started.md')
  // ── PopoverPanel 受控模式演示状态 ────────────────────
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverText, setPopoverText] = useState('hello')
  const [segmentedView, setSegmentedView] = useState<'overview' | 'details'>('overview')
  const [dismissibleAlertVisible, setDismissibleAlertVisible] = useState(true)
  const exportPreviewRef = useRef<HTMLDivElement>(null)
  const notify = useNotify()

  async function exportHtmlSample() {
    if (!exportPreviewRef.current) return
    try {
      const html = await buildRenderedHtmlDocument(exportPreviewRef.current, {
        title: 'UI component export sample',
      })
      downloadHtml(html, 'ui-component-export.html')
      notify.success('已下载可离线打开的 HTML 文件。', 'HTML 导出完成')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      notify.error(message, 'HTML 导出失败')
    }
  }


  // Demo: generate tiny gradient images via pixelsToDataUrl.
  const demoImages = (() => {
    const w = 64, h = 64
    const variants: Array<{
      alt: string
      pixel: (x: number, y: number) => [number, number, number, number]
    }> = [
      { alt: '红绿渐变', pixel: (x, y) => [x, y, 128, 255] },
      { alt: '绿蓝渐变', pixel: (x, y) => [80, x, y, 255] },
      { alt: '蓝红渐变', pixel: (x, y) => [y, 96, x, 255] },
    ]
    return variants.map(({ alt, pixel }) => {
      const pixels: number[] = []
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          pixels.push(...pixel(
            Math.round((x / (w - 1)) * 255),
            Math.round((y / (h - 1)) * 255),
          ))
        }
      }
      return { src: pixelsToDataUrl(pixels, w, h), alt }
    })
  })()
  const demoPixelSrc = demoImages[0].src

  return (
    <div className="p-2 space-y-2 max-w-3xl mx-auto">

      {/* ── FeaturePanel ─────────────────────────────────────── */}
      <FeaturePanel
        title="FeaturePanel"
        description="功能卡片容器，右上角 — 按钮可折叠；支持 icon 和 defaultOpen"
      >
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>这是展开状态。点击右上角 <span className="font-mono">—</span> 按钮可将此卡片折叠为紧凑横条。</p>
          <p>折叠后标题行不消失，点击右侧展开按钮可恢复。传入 <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">defaultOpen=&#123;false&#125;</code> 可初始折叠。</p>
        </div>
      </FeaturePanel>

      <FeaturePanel
        title="默认折叠的卡片"
        description="icon prop 示例：折叠时右侧显示预览图标"
        icon={
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-blue-500">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 8 3z" />
          </svg>
        }
        defaultOpen={false}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">展开后内容区域显示在此。</p>
      </FeaturePanel>

      {/* ── CollapsibleSection ───────────────────────────────── */}
      <FeaturePanel
        title="CollapsibleSection"
        description="面板内可折叠区块，参考 UE DetailView 风格；单击标题切换，Ctrl+Click 递归展开"
      >
        <div className="space-y-1.5">
          <CollapsibleSection title="基本信息（默认展开）">
            <div className="grid grid-cols-[7rem_1fr] divide-y divide-gray-100 dark:divide-gray-700/40">
              <InfoRow dense label="版本" value="0.1.0" />
              <InfoRow dense label="平台" value="Windows / macOS / Linux" />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="图像预览（带 summary 和 icon，默认折叠）"
            summary="256 × 256 · 32 bit · 42 KB"
            icon={
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-indigo-400">
                <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zm4.5 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM2 11l3-4 2 2.5 2-3 3 4.5H2z" />
              </svg>
            }
            defaultOpen={false}
          >
            <div className="grid grid-cols-[7rem_1fr] divide-y divide-gray-100 dark:divide-gray-700/40">
              <InfoRow dense label="尺寸" value="256 × 256 px" />
              <InfoRow dense label="位深" value="32 bit" />
              <InfoRow dense label="大小" value="42 KB" />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="嵌套区块（Ctrl+Click 递归展开/折叠）">
            <div className="p-2 space-y-1.5">
              <CollapsibleSection title="子区块 A" defaultOpen={false} summary="3 项">
                <div className="grid grid-cols-[7rem_1fr] divide-y divide-gray-100 dark:divide-gray-700/40">
                  <InfoRow dense label="键 A1" value="值 1" />
                  <InfoRow dense label="键 A2" value="值 2" />
                  <InfoRow dense label="键 A3" value="值 3" />
                </div>
              </CollapsibleSection>
              <CollapsibleSection title="子区块 B" defaultOpen={false} summary="2 项">
                <div className="grid grid-cols-[7rem_1fr] divide-y divide-gray-100 dark:divide-gray-700/40">
                  <InfoRow dense label="键 B1" value="值 1" />
                  <InfoRow dense label="键 B2" value="值 2" />
                </div>
              </CollapsibleSection>
            </div>
          </CollapsibleSection>
        </div>
      </FeaturePanel>

      {/* ── JsonTree ─────────────────────────────────────────── */}
      <FeaturePanel
        title="JsonTree"
        description="JSON 可视化树控件；单击三角展开一级，Ctrl+Click 递归展开/折叠所有子节点"
      >
        <JsonTree value={DEMO_JSON} initialExpandState={smart_expand_json(DEMO_JSON)} />
      </FeaturePanel>

      {/* ── MarkdownView ─────────────────────────────────────── */}
      <FeaturePanel
        title="MarkdownView"
        description="安全 Markdown 渲染、标题锚点、文档导航、复制原文与超长文档渐进渲染"
      >
        <MarkdownView value={DEMO_MD} className="max-h-64 overflow-auto" />
      </FeaturePanel>

      <FeaturePanel
        title="FileTree"
        description="递归目录、自动展开选中路径、目录吸顶，并支持 Ctrl/Cmd 对照选择"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="max-h-44 overflow-auto rounded border border-gray-200 bg-gray-50 py-1 dark:border-gray-700 dark:bg-gray-950">
            <FileTree
              tree={DEMO_FILE_TREE}
              selectedPath={selectedTreePath}
              onSelectFile={path => setSelectedTreePath(path)}
              stripExtensions={['.md']}
              autoRevealSelected
            />
          </div>
          <div className="rounded border border-gray-200 bg-white p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            当前选择：<span className="font-mono text-blue-600 dark:text-blue-400">{selectedTreePath}</span>
          </div>
        </div>
      </FeaturePanel>

      <FeaturePanel
        title="AsyncWaitingNotice"
        description="可配置分阶段文案、耗时显示和紧凑布局，适合搜索、AI 推理与文件处理"
      >
        <AsyncWaitingNotice compact title="正在生成预览…" />
      </FeaturePanel>

      <FeaturePanel title="SegmentedTabs + MetricCard" description="页内视图切换与仪表盘统计卡片">
        <div className="space-y-3">
          <SegmentedTabs
            items={[
              { id: 'overview', label: '概览', count: 3 },
              { id: 'details', label: '详情' },
            ]}
            value={segmentedView}
            onChange={setSegmentedView}
          />
          {segmentedView === 'overview' ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <MetricCard label="文件" value="24" detail="较上次 +3" tone="blue" />
              <MetricCard label="已完成" value="18" detail="完成率 75%" tone="green" />
              <MetricCard label="待处理" value="6" detail="需要人工确认" tone="yellow" />
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">SegmentedTabs 是受控组件；可在任意业务页内切换局部视图。</p>
          )}
        </div>
      </FeaturePanel>

      <FeaturePanel
        title="FrameStatusBar"
        description="以紧凑状态点展示批处理进度、结果统计和最近帧截断"
      >
        <FrameStatusBar frames={DEMO_FRAMES} maxVisible={32} />
      </FeaturePanel>

      {/* ── 输入控件 ─────────────────────────────────────────── */}
      <FeaturePanel
        title="输入控件"
        description="文本、数字、必填/可空颜色、复选框和单选组"
      >
        <div className="space-y-3">
          <FormField label="单行文本">
            <TextInput value={text} onChange={setText} placeholder="请输入文字…" />
          </FormField>
          <FormField label="多行文本">
            <TextareaInput value={textarea} onChange={setTextarea} rows={3} placeholder="请输入多行内容…" />
          </FormField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormField label="数字" hint="(0–100)">
              <NumberInput value={number} onChange={(v) => setNumber(Number(v))} min={0} max={100} />
            </FormField>
            <FormField label="颜色">
              <ColorField value={color} onChange={setColor} />
            </FormField>
            <FormField label="可空颜色" hint={nullableColor === null ? '未设置' : undefined}>
              <NullableColorField value={nullableColor} onChange={setNullableColor} />
            </FormField>
          </div>
          <CheckboxField checked={checked} onChange={setChecked} label="启用高级选项（CheckboxField）" />
          <FormField label="处理模式">
            <RadioGroup
              name="gallery-processing-mode"
              value={processingMode}
              onChange={setProcessingMode}
              horizontal
              options={[
                { value: 'fast', label: '快速', description: '低延迟' },
                { value: 'balanced', label: '均衡' },
                { value: 'quality', label: '高质量', description: '更精细' },
              ]}
            />
          </FormField>
        </div>
      </FeaturePanel>

      {/* ── 选择控件 ─────────────────────────────────────────── */}
      <FeaturePanel title="选择控件" description="SelectField · FilePicker · DirPicker；文件选择器内置 FileDropZone">
        <div className="space-y-3">
          <FormField label="输出格式">
            <SelectField
              value={select}
              onChange={setSelect}
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'webp', label: 'WebP' },
                { value: 'jpeg', label: 'JPEG' },
                { value: 'ico', label: 'ICO' },
              ]}
            />
          </FormField>
          <FormField label="文件路径">
            <FilePicker value={filePath} onChange={setFilePath} accept={['.png', '.svg']} withDrop dropHint="拖放图片文件" />
          </FormField>
          <FormField label="输出目录">
            <DirPicker value={dirPath} onChange={setDirPath} />
          </FormField>
        </div>
      </FeaturePanel>

      {/* ── Button ───────────────────────────────────────────── */}
      <FeaturePanel title="Button" description="variant: primary · secondary · danger · ghost  |  size: md · sm">
        <div className="space-y-3">
          <SectionTitle>Variant</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <SectionTitle>Size</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="md">Medium (默认)</Button>
            <Button size="sm">Small</Button>
          </div>
          <SectionTitle>状态</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Button loading>加载中…</Button>
            <Button disabled>禁用</Button>
            <Button variant="ghost" title="可用于图标按钮的说明文字">带 title</Button>
            <Button fullWidth variant="secondary">全宽 (fullWidth)</Button>
          </div>
        </div>
      </FeaturePanel>
      {/* ── PopoverPanel ───────────────────────────────── */}
      <FeaturePanel
        title="PopoverPanel"
        description="触发器按鈕 + 浮动面板。点击外部或按 Escape 自动关闭；支持非受控（自管理开关）和受控两种模式"
      >
        <div className="space-y-4">
          <SectionTitle>非受控（最常用）</SectionTitle>
          <div className="flex items-center gap-4 flex-wrap">
            {/* 打开/关闭自管理, 默认对齐 left */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <span>扳手（align=left）</span>
              <PopoverPanel trigger={<WrenchIcon />} align="left" minWidth={200}>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 pb-1.5">服务设置</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-14 shrink-0">地址</span>
                    <TextInput flex value="http://127.0.0.1:11434" onChange={() => {}} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-14 shrink-0">模型</span>
                    <TextInput flex value="glm-ocr" onChange={() => {}} />
                  </div>
                </div>
              </PopoverPanel>
            </div>
            {/* 自定义触发器，对齐 right */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <span>自定义触发器（align=right）</span>
              <PopoverPanel
                trigger={
                  <span className="text-xs px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600
                                   text-gray-500 dark:text-gray-400 select-none">
                    ☰ 菜单
                  </span>
                }
                align="right"
                minWidth={160}
              >
                {(['OCR', '图库', 'HTML 解析', '图像处理'] as const).map((label) => (
                  <button
                    key={label}
                    onClick={() => notify.info(`切换到：${label}`)}
                    className="block w-full text-left text-sm px-1 py-1 rounded
                               text-gray-700 dark:text-gray-200
                               hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </PopoverPanel>
            </div>
          </div>

          <SectionTitle>受控模式</SectionTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <Button size="sm" variant="secondary" onClick={() => setPopoverOpen(o => !o)}>
              {popoverOpen ? '关闭面板' : '外部打开'}
            </Button>
            <PopoverPanel
              trigger={<WrenchIcon size={16} />}
              open={popoverOpen}
              onOpenChange={setPopoverOpen}
              minWidth={200}
            >
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 pb-1.5">受控面板</p>
              <TextInput flex value={popoverText} onChange={setPopoverText} placeholder="任意输入…" />
              <p className="mt-2 text-xs text-gray-400">当前内容：{popoverText || '（空）'}</p>
            </PopoverPanel>
            <span className="text-xs text-gray-400">按钮状态：{popoverOpen ? '已开启' : '已关闭'}</span>
          </div>
        </div>
      </FeaturePanel>
      {/* ── Badge ────────────────────────────────────────────── */}
      <FeaturePanel title="Badge" description="variant: blue · green · yellow · red · gray">
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="blue">信息</Badge>
          <Badge variant="green">已完成</Badge>
          <Badge variant="yellow">处理中</Badge>
          <Badge variant="red">失败</Badge>
          <Badge variant="gray">默认</Badge>
        </div>
      </FeaturePanel>

      {/* ── Alert ────────────────────────────────────────────── */}
      <FeaturePanel title="Alert" description="variant: info · success · warning · error  |  可选 title">
        <div className="space-y-2">
          <Alert variant="info">支持将文件直接拖拽至输入框区域。</Alert>
          <Alert variant="success" title="导出完成">文件已保存至输出目录，共生成 6 种尺寸。</Alert>
          <Alert variant="warning">该操作将覆盖已有文件，请确认后继续。</Alert>
          <Alert variant="error" title="解析失败">无法读取文件头，请确认该文件为有效的 ICO 格式。</Alert>
          {dismissibleAlertVisible ? (
            <Alert variant="info" title="可关闭提示" onClose={() => setDismissibleAlertVisible(false)}>
              使用 onClose 即可提供一个不干扰布局的关闭按钮。
            </Alert>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setDismissibleAlertVisible(true)}>恢复可关闭提示</Button>
          )}
        </div>
      </FeaturePanel>

      {/* ── InfoRow ──────────────────────────────────────────── */}
      <FeaturePanel title="InfoRow + SectionTitle" description="只读键值对布局，用于展示结构化结果">
        <div className="space-y-2">
          <SectionTitle>文件信息（普通模式）</SectionTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
            <InfoRow label="文件名" value="AdvancedPaste.ico" />
            <InfoRow label="包含图像数" value="6 张" />
            <InfoRow label="最大尺寸" value="256 × 256 px" />
            <InfoRow label="色彩位深" value="32 bit" />
          </div>
          <SectionTitle>dense 模式（配合 CollapsibleSection）</SectionTitle>
          <div className="grid grid-cols-[7rem_1fr] divide-y divide-gray-100 dark:divide-gray-700/40 rounded border border-gray-200 dark:border-gray-700/60 overflow-hidden">
            <InfoRow dense label="文件名" value="AdvancedPaste.ico" />
            <InfoRow dense label="图像数量" value="6 张" />
            <InfoRow dense label="最大尺寸" value="256 × 256 px" />
          </div>
        </div>
      </FeaturePanel>

      {/* ── ImageView ────────────────────────────────────────── */}
      <FeaturePanel
        title="ImageView"
        description="图像展示控件；支持 data URL、文件拖放、原始像素数组（pixelsToDataUrl）"
      >
        <div className="space-y-3">
          <SectionTitle>base64 data URL（由 pixelsToDataUrl 生成的 64×64 渐变）</SectionTitle>
          <ImageView src={demoPixelSrc} height={120} showInfo />

          <SectionTitle>拖放区（withDrop — 拖入图片文件后显示）</SectionTitle>
          <div className="flex gap-3">
            <div className="flex-1">
              <ImageView
                src={dropImageSrc}
                withDrop
                accept={['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svg']}
                onDrop={(path) => {
                  // In production: call backend API to read file and return data URL.
                  // Here we convert the file path directly for demo.
                  const isTauri = Boolean(
                    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
                  )
                  if (isTauri) {
                    import('@tauri-apps/api/core').then(({ convertFileSrc }) => {
                      setDropImageSrc(convertFileSrc(path))
                    })
                  } else {
                    setDropImageSrc(path)
                  }
                }}
                height={160}
                hint="拖放 PNG / JPG / WebP / ICO / SVG 文件"
                showInfo
              />
            </div>
            <div className="flex-1">
              <ImageView
                src={dropImageSrc}
                fit="cover"
                height={160}
                hint="（同图像，fit=cover）"
                showInfo
              />
            </div>
          </div>
          {dropImageSrc && (
            <button
              className="text-xs text-red-500 hover:text-red-700 dark:text-red-400"
              onClick={() => setDropImageSrc(null)}
            >
              清除图像
            </button>
          )}
        </div>
      </FeaturePanel>

      <FeaturePanel title="ImageGrid + HTML 导出" description="ClickableImage 灯箱支持缩放、平移和多图键盘导航；导出工具生成离线 HTML 快照">
        <div className="space-y-3">
          <ImageGrid images={demoImages} />
          <div ref={exportPreviewRef} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">可导出的渲染结果</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">样式与可读取图片会被内联到独立 HTML 文件中。</p>
          </div>
          <Button size="sm" variant="secondary" onClick={exportHtmlSample}>导出 HTML 示例</Button>
        </div>
      </FeaturePanel>

      {/* ── Notification ─────────────────────────────────────── */}
      <FeaturePanel title="Notification" description="全局弹出通知，自动消失并向上飘走，支持 info · success · warning · error">
        <div className="space-y-3">
          <SectionTitle>基础等级</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => notify.info('这是一条普通信息通知。')}>
              Info
            </Button>
            <Button variant="ghost" size="sm" onClick={() => notify.success('操作已成功完成！', '导出成功')}>
              Success
            </Button>
            <Button variant="ghost" size="sm" onClick={() => notify.warning('磁盘空间不足，请及时清理。', '警告')}>
              Warning
            </Button>
            <Button variant="ghost" size="sm" onClick={() => notify.error('无法连接到后端服务。', '连接失败')}>
              Error
            </Button>
          </div>
          <SectionTitle>自定义时长</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => notify('快速消失（1.5 秒）', { duration: 1500 })}>
              1.5 s
            </Button>
            <Button variant="secondary" size="sm" onClick={() => notify('默认时长（4 秒）')}>
              4 s（默认）
            </Button>
            <Button variant="secondary" size="sm" onClick={() => notify('持续显示（10 秒）', { level: 'warning', duration: 10000 })}>
              10 s
            </Button>
          </div>
          <SectionTitle>带操作按钮</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                notify('点击下方按钮可在资源管理器中打开所选目录。', {
                  level: 'success',
                  title: '目录已就绪',
                  duration: 8000,
                  action: {
                    label: '打开目录',
                    onClick: () => {
                      if (dirPath) {
                        shellOpen(dirPath)
                      } else {
                        notify.warning('请先在 DirPicker 中选择一个目录。')
                      }
                    },
                  },
                })
              }
            >
              打开所选目录
            </Button>
          </div>
          <SectionTitle>累积叠加</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                notify.success('图标 16×16 已生成')
                setTimeout(() => notify.success('图标 32×32 已生成'), 300)
                setTimeout(() => notify.success('图标 64×64 已生成'), 600)
                setTimeout(() => notify.warning('输出目录已存在同名文件，已覆盖'), 900)
                setTimeout(() => notify.error('256×256 生成失败：内存不足', '部分失败'), 1200)
              }}
            >
              连续触发 5 条
            </Button>
          </div>
        </div>
      </FeaturePanel>
    </div>
  )
}
