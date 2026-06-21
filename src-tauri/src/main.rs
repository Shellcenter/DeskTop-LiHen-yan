// Release 版不弹出后台控制台窗口（Windows GUI 子系统）
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    desktop_pet_lib::run()
}
