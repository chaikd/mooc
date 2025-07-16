import { Dayjs } from "dayjs";
import request from "./request";
import { ResType } from "./types";

export type LiveType = {
  _id?: string;
  title: string;
  description?: string;
  instructorId: string;
  createUserId?: string;
  status?: 'scheduled' | 'live' | 'ended';
  startTime: string | Date;
  endTime: string | Date;
  liveStartTime?: string | Date;
  liveEndTime?: string | Date;
  createTime?: string | Date;
  liveDataId?: string;
  roomToken?: string;
  chatEnabled?: boolean;
  maxViewerCount?: number;
  recordEnabled?: boolean;
  recordUrl?: string;
}

export interface EditLiveType extends LiveType {
  time: (string | Date | Dayjs)[]
}


export function getLiveList(params: { searchValue: string,page: number; size: number; }): Promise<{success?: boolean, data?: LiveType[], total?: number}> {
  return request.get('/api/live/list', { params }).then((res: ResType) => ({...res.data, success: res.success}));
}

export function addLive(data: LiveType): Promise<ResType> {
  return request.post('/api/live/add', data);
}

export function editLive(data: LiveType): Promise<ResType> {
  return request.post('/api/live/edit', data);
}

export function deleteLive(data: { id: string; }): Promise<ResType> {
  return request.post('/api/live/delete', data);
}

export function getLiveDetail(id: string): Promise<LiveType> {
  return request.get(`/api/live/${id}`).then(res => res.data);
}
