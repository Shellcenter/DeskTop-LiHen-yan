use serde::{Deserialize, Serialize};
use std::ffi::OsStr;
use std::fs;
use std::sync::Mutex;
use sysinfo::{ProcessesToUpdate, System};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri::window::Color;

// ─── 配置结构 ───

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PetConfig {
    pub scale: f64,
    pub opacity: f64,
    pub always_on_top: bool,
    pub auto_hide: bool,
    pub current_state: String,
    pub voice_enabled: bool,
    pub claude_code_detected: bool,
    pub auto_start: bool,
}

impl Default for PetConfig {
    fn default() -> Self {
        Self {
            scale: 1.0,
            opacity: 1.0,
            always_on_top: true,
            auto_hide: false,
            current_state: "idle".into(),
            voice_enabled: false,
            claude_code_detected: false,
            auto_start: false,
        }
    }
}

// ─── 应用状态 ───

pub struct AppState {
    pub config: Mutex<PetConfig>,
    pub system: Mutex<System>,
}

// ─── 检查 claude 进程 ───

fn is_claude_running(system: &mut System) -> bool {
    system.refresh_processes(ProcessesToUpdate::All, true);
    // 匹配多种 Claude 进程名变体
    let names = ["claude", "claude.exe", "claude-code", "claude-code.exe"];
    names.iter().any(|name| {
        system.processes_by_name(OsStr::new(name)).count() > 0
    })
}

// ─── 开机自启管理（Windows 注册表） ───

fn set_auto_start(enabled: bool) -> Result<(), String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("获取程序路径失败: {}", e))?;
    let exe_str = exe_path.to_string_lossy().to_string();

    // 使用 reg add / reg delete 管理 HKCU 启动项
    let key = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run";
    let name = "DesktopPet";

    if enabled {
        let output = std::process::Command::new("reg")
            .args(["add", key, "/v", name, "/t", "REG_SZ", "/d", &exe_str, "/f"])
            .output()
            .map_err(|e| format!("reg add 失败: {}", e))?;
        if !output.status.success() {
            return Err("设置开机自启失败".into());
        }
    } else {
        let _output = std::process::Command::new("reg")
            .args(["delete", key, "/v", name, "/f"])
            .output()
            .map_err(|e| format!("reg delete 失败: {}", e))?;
        // 如果键不存在也视为成功
    }
    Ok(())
}

fn get_auto_start() -> bool {
    let key = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run";
    let name = "DesktopPet";
    let output = std::process::Command::new("reg")
        .args(["query", key, "/v", name])
        .output()
        .ok();
    match output {
        Some(out) => out.status.success(),
        None => false,
    }
}

// ─── Tauri Commands ───

#[tauri::command]
fn get_config(state: State<AppState>) -> Result<PetConfig, String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    // 同步实际的开机自启状态
    config.auto_start = get_auto_start();
    Ok(config.clone())
}

#[tauri::command]
fn set_config(app: AppHandle, state: State<AppState>, config: PetConfig) -> Result<(), String> {
    let mut current = state.config.lock().map_err(|e| e.to_string())?;
    let old_auto_start = current.auto_start;
    *current = config.clone();

    // 处理开机自启
    if old_auto_start != config.auto_start {
        set_auto_start(config.auto_start)?;
    }

    if let Some(window) = app.get_webview_window("main") {
        window
            .set_always_on_top(config.always_on_top)
            .map_err(|e| e.to_string())?;
    }

    // 持久化保存
    if let Ok(data_dir) = get_app_data_dir() {
        let path = data_dir.join("config.json");
        if let Ok(json) = serde_json::to_string_pretty(&config) {
            let _ = fs::write(&path, json);
        }
    }
    let _ = app.emit("config-updated", config);
    Ok(())
}

#[tauri::command]
fn fit_pet_window(app: AppHandle, width: u32, height: u32) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_size(tauri::LogicalSize::new(
                width.clamp(120, 900),
                height.clamp(160, 1000),
            ))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn is_claude_running_cmd(state: State<AppState>) -> Result<bool, String> {
    let mut system = state.system.lock().map_err(|e| e.to_string())?;
    Ok(is_claude_running(&mut system))
}

#[tauri::command]
fn start_claude_process() -> Result<(), String> {
    let result = std::process::Command::new("cmd")
        .args(["/C", "start", "cmd", "/K", "claude"])
        .spawn();
    match result {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("启动 Claude Code 失败: {}", e)),
    }
}

#[tauri::command]
fn open_dashboard(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("dashboard")
        .ok_or("设置窗口未创建，请重启桌宠")?;

    let _ = window.unminimize();
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

// ─── 工具函数 ───

fn get_app_data_dir() -> Result<std::path::PathBuf, String> {
    let dir = if let Some(appdata) = std::env::var_os("APPDATA") {
        std::path::PathBuf::from(appdata).join("desktop-pet")
    } else if let Some(home) = std::env::var_os("HOME") {
        std::path::PathBuf::from(home).join(".desktop-pet")
    } else {
        std::path::PathBuf::from("desktop-pet")
    };
    let _ = fs::create_dir_all(&dir);
    Ok(dir)
}

fn load_config() -> PetConfig {
    if let Ok(data_dir) = get_app_data_dir() {
        let path = data_dir.join("config.json");
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }
    PetConfig::default()
}

// ─── 后台任务：定期检测 Claude Code ───

fn start_claude_monitor(app: AppHandle) {
    std::thread::spawn(move || {
        let mut system = System::new();
        loop {
            let found = is_claude_running(&mut system);
            let _ = app.emit("claude-code-status", found);
            std::thread::sleep(std::time::Duration::from_secs(3));
        }
    });
}

// ─── 程序入口 ───

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = load_config();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            config: Mutex::new(config),
            system: Mutex::new(System::new()),
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_config,
            fit_pet_window,
            is_claude_running_cmd,
            start_claude_process,
            open_dashboard,
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_shadow(false);
                let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
                // 等前端加载完成后显示窗口，避免白屏闪烁
                let win = window.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(600));
                    let _ = win.show();
                    let _ = win.set_focus();
                });
            }
            let handle = app.handle().clone();
            start_claude_monitor(handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("桌宠运行失败");
}
