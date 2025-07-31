// utils/findAvailableUdpPort.js
import dgram from 'dgram';
/**
 * 检查某个 UDP 端口是否可用
 * @param {number} port
 * @param {string} host
 * @returns {Promise<boolean>}
 */
function isUdpPortAvailable(port: number, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');

    socket.once('error', () => {
      socket.close();
      resolve(false);
    });

    socket.once('listening', () => {
      socket.close();
      resolve(true);
    });

    // 尝试 bind 看是否报错
    socket.bind(port, host);
  });
}

/**
 * 在 [start, end] 范围内寻找可用的 UDP 端口
 * @param {number} start 起始端口（包含）
 * @param {number} end   结束端口（包含）
 * @param {string} host  监听地址，默认 '127.0.0.1'
 * @returns {Promise<number>} 可用端口
 */
async function findAvailableUdpPort(start = 50000, end = 60000, host = '127.0.0.1') {
  for (let port = start; port <= end; port++) {
    const ok = await isUdpPortAvailable(port, host);
    if (ok) return port;
  }
  throw new Error(`No available UDP port in range ${start}–${end}`);
}

export { findAvailableUdpPort, isUdpPortAvailable };
