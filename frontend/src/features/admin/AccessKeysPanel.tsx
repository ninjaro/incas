import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";

import type { AccessKeyInfo, CreatedAccessKey } from "../../api/types";
import { DataViews } from "./DataViews";
import { ErrorState, Field, Loading, PageHeader, StatusBadge } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useSession } from "../../auth/SessionContext";
import { useAsync } from "../../hooks/useAsync";
import { absoluteAppUrl } from "../../utils/assets";

type BarcodeResult = { rawValue: string };
type BarcodeDetectorInstance = { detect(source: ImageBitmap | HTMLVideoElement): Promise<BarcodeResult[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

function datetimeLocalTomorrow() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseScannedKey(value: string) {
  const match = value.match(/\/admin\/unlock\/([^/?#]+)/);
  return decodeURIComponent(match?.[1] ?? value.trim());
}

function QrScanner() {
  const session = useSession();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [message, setMessage] = useState("");
  const detectorClass = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

  const unlockValue = async (value: string) => {
    try {
      const result = await session.unlock(parseScannedKey(value));
      setMessage(`Unlocked: ${result.newScopes?.join(", ") || "already active"}`);
    } catch {
      setMessage("The QR code does not contain a valid access key.");
    }
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !detectorClass) return;
    const image = await createImageBitmap(file);
    const results = await new detectorClass({ formats: ["qr_code"] }).detect(image);
    image.close();
    if (results[0]) await unlockValue(results[0].rawValue);
    else setMessage("No QR code was found in that image.");
  };
  const camera = async () => {
    if (!detectorClass || !video.current) return;
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.current.srcObject = stream.current;
      await video.current.play();
      const detector = new detectorClass({ formats: ["qr_code"] });
      for (let attempt = 0; attempt < 60 && stream.current; attempt += 1) {
        const results = await detector.detect(video.current);
        if (results[0]) {
          stream.current.getTracks().forEach((track) => track.stop());
          stream.current = null;
          await unlockValue(results[0].rawValue);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      setMessage("No QR code detected. Try an uploaded photo.");
    } catch {
      setMessage("Camera access is unavailable. You can upload a QR image instead.");
    }
  };
  return <section className="card qr-scanner"><h2>Scan an access key</h2>{detectorClass ? <><div className="form-actions"><label className="btn btn-outline btn-sm">Upload QR image<input className="sr-only" type="file" accept="image/*" capture="environment" onChange={upload} /></label><button className="btn btn-outline btn-sm" type="button" onClick={camera}>Use camera</button></div><video ref={video} muted playsInline /></> : <p>Your browser does not support QR detection. Enter the key in the admin sidebar.</p>}{message ? <p className="notice notice-info" role="status">{message}</p> : null}</section>;
}

export function AccessKeysPanel() {
  const data = useData();
  const state = useAsync(() => data.getAccessKeys(), [data]);
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState(datetimeLocalTomorrow);
  const [created, setCreated] = useState<CreatedAccessKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (state.loading && !state.data) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try { const result = await data.createAccessKey({ label, scopes, expiresAt }); setCreated(result); setLabel(""); setScopes([]); state.reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Key creation failed."); }
    finally { setBusy(false); }
  };
  const update = async (item: AccessKeyInfo, action: "revoke" | "expire") => { if (action === "revoke") await data.revokeAccessKey(item.id); else await data.expireAccessKey(item.id); state.reload(); };
  const actions = (item: AccessKeyInfo) => item.status === "active" ? <div className="form-actions"><button type="button" className="btn btn-outline btn-sm" onClick={() => update(item, "expire")}>Expire now</button><button type="button" className="btn btn-danger btn-sm" onClick={() => update(item, "revoke")}>Revoke</button></div> : null;
  const card = (item: AccessKeyInfo) => <><small>{item.prefix}...</small><h3>{item.label || "Unlabelled key"}</h3><StatusBadge status={item.status} /><p>{item.scopes.join(", ")}</p><time>{new Date(item.expiresAt).toLocaleString()}</time>{actions(item)}</>;
  const qrUrl = created ? absoluteAppUrl(`/admin/unlock/${encodeURIComponent(created.secret)}`) : "";
  return <><PageHeader kicker="Admin" title="Access keys" sub="Secrets are shown only once. Existing keys are always masked." />{created ? <section className="card created-key" role="status"><div><h2>Store this key now</h2><code>{created.secret}</code><p>This secret cannot be displayed again.</p></div><QRCodeSVG value={qrUrl} size={190} bgColor="#fffdfb" fgColor="#111827" level="M" marginSize={2} title="Access key QR code" /></section> : null}<form className="card public-form" onSubmit={submit}><div className="form-grid"><Field label="Label"><input value={label} onChange={(event) => setLabel(event.target.value)} /></Field><Field label="Expires"><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></Field></div><fieldset><legend>Scopes</legend><div className="scope-grid">{state.data.availableScopes.map((scope) => <label className="check-row" key={scope.value}><input type="checkbox" checked={scopes.includes(scope.value)} onChange={(event) => setScopes(event.target.checked ? [...scopes, scope.value] : scopes.filter((value) => value !== scope.value))} />{scope.label}</label>)}</div></fieldset>{error ? <p className="notice notice-bad">{error}</p> : null}<button className="btn btn-primary" type="submit" disabled={busy || !scopes.length}>Create key</button></form><QrScanner /><DataViews items={state.data.items} keyFor={(item) => item.id} columns={["Prefix", "Label", "Scopes", "Status", "Expires", "Actions"]} renderCells={(item) => [`${item.prefix}...`, item.label || "-", item.scopes.join(", "), <StatusBadge status={item.status} />, new Date(item.expiresAt).toLocaleString(), actions(item)]} renderCard={card} empty="No generated access keys." /></>;
}
