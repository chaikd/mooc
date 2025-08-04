import { findAvailableUdpPort } from "@/utils/visiblePort";
import { spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { Consumer, PlainTransport } from "mediasoup/node/lib/types";
import { join } from "path";

const ffmpegMap = new Map()

export async function startFFmpeg({
  plainTransport, roomId, consumer
}: {plainTransport: PlainTransport, roomId: string, consumer: Consumer}) {
  if(ffmpegMap.has(roomId)) {
    const cur = ffmpegMap.get(roomId)
    cur.kill()
    ffmpegMap.delete(roomId)
  }
  const ffmpegPort = await findAvailableUdpPort(50000, 60000);
  const ffmpegRtcpPort = await findAvailableUdpPort(ffmpegPort + 1);
  const outputDir = join(process.cwd(), `/tmp/hls/${roomId}`)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  plainTransport.observer.on('trace', trace => {
    console.log('plainTransport [RTP]', trace);
  });
  const sdpText = generateRtpSdp(consumer, ffmpegPort, ffmpegRtcpPort)
  console.log('sdpText', sdpText)
  const fileId = 'live'
  // 启动FFmpeg转HLS
  const ffmpeg = spawn('ffmpeg', [
    // '-i', `rtp://127.0.0.1:${plainTransport.tuple.localPort}?rtcpport=${plainTransport.rtcpTuple?.localPort}`,
    // '-f', 'rtp', 
    // '-i', `rtp://127.0.0.1:${ffmpegPort}?rtcpport=${ffmpegRtcpPort}&localrtcpport=${ffmpegRtcpPort}`,
    '-protocol_whitelist', 'file,udp,rtp,pipe',
    '-f', 'sdp',
    '-i', 'pipe:0',
    '-map', '0:v:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-profile:v', 'main',
    '-level:v', '3.1',
    '-b:v', '1500k',
    '-maxrate', '1500k',
    '-bufsize', '3000k',
    '-g', '60',
    '-r', '30',
    '-an', // 表示无音频
    '-f', 'hls',
    '-vf', 'scale=1280:720',
    '-fflags', 'nobuffer',
    '-fflags', '+genpts',
    '-flags', 'low_delay',
    '-probesize', '1000000',
    '-analyzeduration','5000000',
    '-probesize', '32',
    '-hls_time', '4',
    '-hls_list_size', '10',
    '-hls_flags', 'delete_segments+append_list',
    '-hls_segment_filename', join(outputDir, `segment_${fileId}_%03d.ts`),
    join(outputDir, `playlist_${fileId}.m3u8`)
  ]);
  ffmpeg.stdin.write(sdpText)
  setImmediate(() => {
    ffmpeg.stdin.end()
  })

  ffmpeg.stderr.on('data', (data) => {
    console.log(`FFmpeg data: ${data}`);
    ffmpegMap.set(roomId, ffmpeg)
  });

  ffmpeg.on('error', (err) => {
    console.error('FFmpeg error:', err);
  });

  ffmpeg.on('close', (code) => {
    console.log(`FFmpeg 退出，代码: ${code}`);
    consumer.close();
    plainTransport.close();
  });

  ffmpeg.on('exit', code => {
    console.log('FFmpeg exit', code)
    ffmpegMap.delete(roomId)
  });
  return {
    ffmpeg,
    ffmpegPort,
    ffmpegRtcpPort
  }
}

/**
 * 生成一段最小 SDP，供 FFmpeg -f sdp -i pipe:0 读取
 *
 * @param {Object} consumer    mediasoup Consumer 对象
 * @param {number} rtpPort     FFmpeg 要监听的 RTP 端口
 * @param {number} rtcpPort    FFmpeg 要监听的 RTCP 端口
 * @returns {string}           SDP 文本
 */
function generateRtpSdp(consumer: Consumer, rtpPort: number, rtcpPort: number) {
  const codec = consumer.rtpParameters.codecs[0];
  console.log('codec', codec)
  const pt    = codec.payloadType;
  const type = codec.mimeType.split('/')[0];
  const codecName = codec.mimeType.split('/')[1]; // e.g. 'opus', 'VP8'
  const clockRate = codec.clockRate;

  return [
    'v=0',
    'o=- 0 0 IN IP4 127.0.0.1',
    's=mediasoup-stream',
    't=0 0',
    '',
    `m=${type} ${rtpPort} RTP/AVP ${pt}`,
    `c=IN IP4 127.0.0.1`,
    `a=rtpmap:${pt} ${codecName}/${clockRate}`,
    // 如果是 video，可加 frame 参数；audio 可添加 channels
    // `a=fmtp:${pt} packetization-mode=1`, // 按需
    '',
    'a=recvonly',
    `a=rtcp:${rtcpPort} IN IP4 127.0.0.1`,
    ''
  ].join('\r\n');
}
