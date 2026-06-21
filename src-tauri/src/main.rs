// Release 版不弹出后台控制台窗口（Windows GUI 子系统）
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    #[cfg(windows)]
    {
        // 用锁定文件检测是否已有实例在运行
        let lock_file = std::env::temp_dir().join("desktop_pet.lock");
        if lock_file.exists() {
            let _ = std::process::Command::new("powershell")
                .args([
                    "-Command",
                    "& {(Add-Type -AssemblyName System.Windows.Forms); [System.Windows.Forms.MessageBox]::Show('离恨烟桌宠已在运行中~','离恨烟桌宠','OK','Information')}",
                ])
                .spawn();
            return;
        }
        // 创建锁定文件，程序退出时自动清理
        let _ = std::fs::write(&lock_file, "");
    }

    desktop_pet_lib::run();

    // 退出后删除锁定文件
    #[cfg(windows)]
    {
        let lock_file = std::env::temp_dir().join("desktop_pet.lock");
        let _ = std::fs::remove_file(lock_file);
    }
}
