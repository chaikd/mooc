// import axios from "axios";
import { redirect } from "next/navigation";

export interface responseType {
  message?: string;
  success?: boolean;
  data?: object | [];
}


const host = process.env.NEXT_PUBLIC_API_HOST;

const nextFetchConfig = {
  revalidate: 60
}

// const request = axios.create({
//   timeout: 6000,
// });
// request.interceptors.request.use(
//   (req) => {
//     req.url = host + req.url;
//     return req;
//   },
//   (err) => {
//     return Promise.reject(err);
//   }
// );

// request.interceptors.response.use(
//   (res) => {
//     return res.data;
//   },
//   (err) => {
//     console.log(err);
//     if (err.response?.status === 401 || err.response?.status === 403) {
//       redirect("/");
//     }
//     return err.response?.data;
//   }
// );

const requestCatch = err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      redirect("/");
    }
    return err.response?.data;
  }

const request = (url) => {
  return request.get(url)
}

request.get = (url) => {
  url = host + url
  return fetch(url, {
    method: 'get',
    next: nextFetchConfig
  }).then(res => {
    return res.json()
  }).catch(requestCatch)
}

request.post = (url, body) => {
  url  = host + url
  return fetch(url, {
    method: 'post',
    next: nextFetchConfig,
    body: JSON.stringify(body)
  }).then(res => {
    return res.json()
  }).catch(requestCatch)
}

export default request;
