// Release 版不弹出后台控制台窗口（Windows GUI 子系统）
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    #[cfg(windows)]
    {
        // 单实例保护：通过锁定文件防止重复启动
        let lock_path = std::env::temp_dir().join(".desktop_pet_instance.lock");

        match std::fs::File::create_new(&lock_path) {
            Ok(_) => {
                // 首次启动成功，程序退出时自动删除锁文件
                let lp = lock_path.clone();
                std::thread::spawn(move || {
                    // 3 秒后写 PID 确认进程正常运行
                    std::thread::sleep(std::time::Duration::from_secs(3));
                    let pid = std::process::id().to_string();
                    let _ = std::fs::write(&lp, &pid);
                });
            }
            Err(_) => {
                // 锁文件已存在 → 已有实例在运行
                // 尝试读取 PID 判断进程是否真的活着
                let stale = std::fs::read_to_string(&lock_path)
                    .ok()
                    .and_then(|pid| pid.parse::<u32>().ok())
                    .map(|pid| std::process::Command::new("tasklist")
                        .args(&["/FI", &format!("PID eq {}", pid), "/NH"])
                        .output()
                        .ok()
                        .map(|o| String::from_utf8_lossy(&o.stdout).contains(&pid.to_string()))
                        .unwrap_or(false))
                    .unwrap_or(true);

                if stale {
                    // 真的在运行 → 弹提示退出
                    let _ = std::process::Command::new("powershell")
                        .args(["-Command",
                            "& {(Add-Type -AssemblyName System.Windows.Forms); [System.Windows.Forms.MessageBox]::Show('离恨烟桌宠已在运行中~','离恨烟桌宠','OK','Information')}"
                        ])
                        .spawn();
                    return;
                }
                // 锁文件过期（上次异常退出）→ 覆盖后继续启动
                let _ = std::fs::write(&lock_path, "");
            }
        }
    }

    desktop_pet_lib::run();

    // 退出时清理锁文件
    #[cfg(windows)]
    {
        let lock_path = std::env::temp_dir().join(".desktop_pet_instance.lock");
        let _ = std::fs::remove_file(lock_path);
    }
}
