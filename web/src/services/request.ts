import axios from "axios";
import { redirect } from "next/navigation";

export interface responseType {
  message?: string;
  success?: boolean;
  data?: object | [];
}

const request = axios.create({
  timeout: 6000,
});

const host = process.env.NEXT_PUBLIC_API_HOST;

request.interceptors.request.use(
  (req) => {
    req.url = host + req.url;
    return req;
  },
  (err) => {
    return Promise.reject(err);
  }
);

request.interceptors.response.use(
  (res) => {
    return res.data;
  },
  (err) => {
    console.log(err);
    if (err.response?.status === 401 || err.response?.status === 403) {
      redirect("/");
    }
    return err.response?.data;
  }
);

export default request;
