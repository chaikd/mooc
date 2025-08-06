import { spawn } from "child_process";
import { existsSync, mkdirSync, rm } from "fs";
import { join } from "path";
import { PlainTransportListItemType } from "../mediasoup/transcoder";
interface StartFFmpegParams {
  plainTransportList: PlainTransportListItemType[], 
  roomId: string, 
  onStart?: () => void,
  onOpening?: () => void,
  onExit?: () => void
}
const ffmpegMap = new Map()

export function startFFmpeg({
  plainTransportList, roomId, onStart, onOpening, onExit
}: StartFFmpegParams) {
  if(ffmpegMap.has(roomId)) {
    deleteFFmpegItem(roomId)
  }
  // const ffmpegPort = await findAvailableUdpPort(50000, 60000);
  // const ffmpegRtcpPort = await findAvailableUdpPort(ffmpegPort + 1);
  const outputDir = generateOutputDirPath(roomId)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const sdpText = generateRtpSdp(plainTransportList)
  const fileId = 'live'
  // 启动FFmpeg转HLS
  const ffmpeg = spawn('ffmpeg', [
    '-protocol_whitelist', 'file,udp,rtp,pipe',
    '-f', 'sdp',
    '-i', 'pipe:0',
    '-map', '0',
    '-c:v', 'libx264',
    '-c:a', 'aac',

    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-profile:v', 'main',
    '-level:v', '3.1',
    '-b:v', '1500k',
    '-maxrate', '1500k',
    '-bufsize', '3000k',
    '-g', '60',
    '-r', '30',
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
    '-hls_segment_filename', 
    join(outputDir, `segment_${fileId}_%03d.ts`),
    join(outputDir, `playlist_${fileId}.m3u8`)
  ]);
  ffmpeg.stdin.write(sdpText)
  setImmediate(() => {
    ffmpeg.stdin.end()
  })

  let onData: (() => void) | null = () => {
    ffmpegMap.set(roomId, ffmpeg)
    if(onStart) {
      onStart()
    }
    onData = null
  }

  let onWriteFile: (() => void) | null = () => {
    if(onOpening) {
      onOpening()
    }
    onWriteFile = null
  }

  ffmpeg.stderr.on('data', (data) => {
    console.log(`FFmpeg data: ${data}`);
    if(onData) {
      onData()
    }
    if(data.toString().includes('Opening')) {
      onWriteFile && onWriteFile()
    }
  });

  ffmpeg.on('error', (err) => {
    console.error('FFmpeg error:', err);
  });

  ffmpeg.on('close', (code) => {
    console.log(`FFmpeg 退出，代码: ${code}`);
    if(onExit) {
      onExit()
    }
  });

  ffmpeg.on('exit', code => {
    console.log('FFmpeg exit', code)
    if(onExit) {
      onExit()
    }
  });
  return {
    ffmpeg,
    // ffmpegPort,
    // ffmpegRtcpPort
  }
}

export function stopFFmpeg(roomId: string) {
  deleteFFmpegItem(roomId)
  const outputDir = generateOutputDirPath(roomId)
  rm(outputDir, {
    recursive: true,
    force: true
  }, (err) => {
    if (err) {
      console.error('删除失败:', err);
    }
  })
}

export function isFFmpeg(roomId: string) {
  const isffmpeg = ffmpegMap.has(roomId) 
  const ffmpeg = ffmpegMap.get(roomId)
  return isffmpeg && !ffmpeg.stderr.closed
}

function deleteFFmpegItem(roomId: string) {
  if(ffmpegMap.has(roomId)) {
    const cur = ffmpegMap.get(roomId)
    cur.kill()
    ffmpegMap.delete(roomId)
  }
}

function generateOutputDirPath(roomId: string) {
  return join(process.cwd(), `/tmp/hls/${roomId}`)
}

/**
 * 生成一段最小 SDP，供 FFmpeg -f sdp -i pipe:0 读取
 *
 * @param {Object} consumer    mediasoup Consumer 对象
 * @param {number} rtpPort     FFmpeg 要监听的 RTP 端口
 * @param {number} rtcpPort    FFmpeg 要监听的 RTCP 端口
 * @returns {string}           SDP 文本
 */
function generateRtpSdp(plainTransportList: PlainTransportListItemType[]) {
  const sdp = [
    'v=0',
    'o=- 0 0 IN IP4 127.0.0.1',
    's=mediasoup-stream',
    't=0 0',
  ]

  plainTransportList.forEach((item) => {
    const codec = item.consumer.rtpParameters.codecs[0];
    const payloadType = codec.payloadType;
    const type = codec.mimeType.split('/')[0];
    const codecName = codec.mimeType.split('/')[1]; // e.g. 'opus', 'VP8'
    const clockRate = codec.clockRate;
    const fmtp = codec.parameters
      ? Object.entries(codec.parameters).map(([k, v]) => `${k}=${v}`).join(';')
      : '';
    const encoding = item.consumer.rtpParameters.encodings?.[0]
    const rtcpCname = item.consumer.rtpParameters.rtcp?.cname
    sdp.push(...[
      '',
      `m=${type} ${item.ffmpegPort} RTP/AVP ${payloadType}`,
      `c=IN IP4 127.0.0.1`,
      `a=rtpmap:${payloadType} ${codecName}/${clockRate}`,
      fmtp ? `a=fmtp:${payloadType} ${fmtp}` : '',
      `a=ssrc:${encoding?.ssrc} cname:${rtcpCname || 'mediasoup'}`,
      'a=recvonly',
      type === 'video' ? 'a=framesize:101 640-480' : '',
      `a=rtcp:${item.ffmpegRtcpPort} IN IP4 127.0.0.1`,
    ])
  })
  return sdp.join('\r\n')
}
