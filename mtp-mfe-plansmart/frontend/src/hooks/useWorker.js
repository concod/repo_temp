import React, { useEffect, useState } from "react";

function useWorker(workerFile) {
  const [worker, setWorker] = useState(null);
  useEffect(() => {
    fetch(`${window.plansmartUrl}/${workerFile}`)
      .then((resp) => {
        return resp.blob();
      })
      .then((blobResp) => {
        const blob = new Blob([blobResp], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        const worker = new Worker(blobUrl);
        setWorker(worker);
      })
      .catch((err) => {
        console.log("worker file error: ", err);
      });
    return () => {
      worker && worker.terminate();
    };
  }, []);
  return [worker];
}

export default useWorker;
