import router from '@/routes'
// import { getToken } from '@/utils/token'
import axios from 'axios'

const request = axios.create({
  timeout: 6000
})

request.interceptors.request.use((req) => {
  // const token = getToken()
  // req.headers.set('Authorization', token)
  return req
}, (err) => {
  return Promise.reject(err)
})

request.interceptors.response.use((res) => {
  return res.data
}, err => {
  if(err.response.state === 401) {
    router.navigate('/login')
  }
  return err.response.data
})

export default request