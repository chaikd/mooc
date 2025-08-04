type MediaStreamType = 'display' | 'user'
type TrackType = 'audio' | 'video' | 'both' | object
export function getMediaStream(type: MediaStreamType, trackType: TrackType = 'both') {
  const getStream = type === 'display' 
    ? navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices)
    : navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
  let options
  if(typeof trackType === 'object') {
    options = trackType
  } else {
    const audioOption = {
      echoCancellation: true,   // ✅ 回声消除
      noiseSuppression: true,   // ✅ 噪声抑制
      autoGainControl: true     // ✅ 自动增益控制
    }
    options = trackType === 'both'
      ? {audio: audioOption, video: true}
      : {audio: trackType === 'audio' && audioOption, video: trackType === 'video'} 
  }
  return getStream(options)
}