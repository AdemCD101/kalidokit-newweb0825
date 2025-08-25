// 舌头检测结果的类型定义
export interface TongueDetection {
  detected: boolean;        // 是否检测到舌头
  extension: number;        // 舌头伸出程度 (0-1)
  openness: number;         // 嘴部开合度 (0-1)
  timestamp: number;        // 检测时间戳
}

// 扩展 Window 接口以包含舌头检测状态
declare global {
  interface Window {
    tongueDetection?: TongueDetection;
  }
}

export {};
