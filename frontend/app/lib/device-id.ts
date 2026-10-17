import { useEffect, useState } from "react";

const KEY = "cocktail-navi-device-id";

// ログインの代わりに、ブラウザごとのランダムな端末IDで匿名のまま記録する
export function useDeviceId() {
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    try {
      let id = localStorage.getItem(KEY);
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(KEY, id);
      }
      setDeviceId(id);
    } catch {
      // プライベートモードなどで保存できないときは、このページの間だけ使う
      setDeviceId(crypto.randomUUID());
    }
  }, []);

  return deviceId;
}
