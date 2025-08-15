declare module '*.svg' {
  const str: string
  export default str
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SOCKETIO_HOST?: string;
    }
  }

  interface ImportMetaEnv {
    SOCKETIO_HOST?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}