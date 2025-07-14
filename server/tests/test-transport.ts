import { createTransportManager } from '@/servers/redis/transport'

async function testTransportManager() {
  try {
    const transportManager = await createTransportManager()
    const roomId = 'test-room-123'
    const transportId = 'test-transport-456'
    
    console.log('🧪 Testing Transport Manager...')
    
    // 测试保存 transport
    console.log('1. Testing saveTransport...')
    await transportManager.saveTransport(roomId, transportId, {
      direction: 'send',
      iceParameters: { usernameFragment: 'test', password: 'test123' },
      iceCandidates: [{ foundation: 'test', protocol: 'udp', ip: '127.0.0.1', port: 12345 }],
      dtlsParameters: { role: 'client', fingerprints: [] }
    })
    console.log('✅ Transport saved successfully')
    
    // 测试获取 transport
    console.log('2. Testing getTransport...')
    const transport = await transportManager.getTransport(roomId, transportId)
    if (transport) {
      console.log('✅ Transport retrieved:', transport.id, transport.direction)
    } else {
      console.log('❌ Transport not found')
    }
    
    // 测试更新连接状态
    console.log('3. Testing updateTransportConnection...')
    await transportManager.updateTransportConnection(roomId, transportId)
    console.log('✅ Transport connection updated')
    
    // 测试获取统计信息
    console.log('4. Testing getRoomTransportStats...')
    const stats = await transportManager.getRoomTransportStats(roomId)
    console.log('✅ Transport stats:', stats)
    
    // 测试获取房间所有 transport
    console.log('5. Testing getRoomTransports...')
    const transports = await transportManager.getRoomTransports(roomId)
    console.log('✅ Room transports count:', transports.length)
    
    // 测试清理
    console.log('6. Testing cleanupRoomTransports...')
    await transportManager.cleanupRoomTransports(roomId)
    console.log('✅ Room transports cleaned up')
    
    console.log('🎉 All tests passed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testTransportManager()
}

export { testTransportManager } 