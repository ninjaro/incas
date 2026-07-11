import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useSession } from "../../auth/SessionContext";

export function UnlockRoute() {
  const { key = "" } = useParams();
  const session = useSession();
  const unlock = session.unlock;
  const [message, setMessage] = useState("Activating access key...");
  useEffect(() => {
    void unlock(key).then((result) => setMessage(`Unlocked: ${result.newScopes?.join(", ") || "already active"}`)).catch(() => setMessage("This access key is invalid or expired."));
  }, [key, unlock]);
  return <div className="state-box" role="status"><p>{message}</p><Link className="btn btn-primary" to="/admin">Open admin</Link></div>;
}
