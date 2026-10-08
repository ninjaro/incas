import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";

import type { AccessKeyInfo, CreatedAccessKey } from "../../api/types";
import { DataViews } from "./DataViews";
import { ConfirmDialog, ErrorState, Field, Loading, PageHeader, StatusBadge } from "../../components/ui";
import { useData } from "../../data/DataProviderContext";
import { useSession } from "../../auth/SessionContext";
import { useAsync } from "../../hooks/useAsync";
import { useCurrentLocale } from "../../i18n/LocaleContext";
import { accessKeyActivationUrl } from "../../utils/assets";
import { dateTimeLocalTomorrow, fromDateTimeLocal } from "../../utils/datetime";
import { capabilityLabel } from "./labels";

type BarcodeResult = { rawValue: string };
type BarcodeDetectorInstance = { detect(source: ImageBitmap | HTMLVideoElement): Promise<BarcodeResult[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

function parseScannedKey(value: string) {
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.hash.startsWith("#access-key=")) {
      return decodeURIComponent(parsed.hash.slice("#access-key=".length));
    }
    if (parsed.hash.startsWith("#/")) {
      const query = parsed.hash.split("?", 2)[1] ?? "";
      const key = new URLSearchParams(query).get("accessKey");
      if (key) return key;
    }
  } catch {
    // A raw key remains a supported scanner input.
  }
  return trimmed;
}

export function QrScanner() {
  const session = useSession();
  const locale = useCurrentLocale();
  const de = locale === "de";
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const scanRun = useRef(0);
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const detectorClass = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  const stopCamera = useCallback(() => {
    scanRun.current += 1;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setScanning(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const unlockValue = async (value: string) => {
    try {
      const result = await session.unlock(parseScannedKey(value));
      const names = (result.newScopes ?? []).map((scope) => capabilityLabel(scope, locale, result.capabilityLabels)).join(", ");
      setMessage({ tone: "ok", text: de ? `Freigeschaltet: ${names || "bereits aktiv"}` : `Unlocked: ${names || "already active"}` });
    } catch {
      setMessage({ tone: "bad", text: de ? "Der QR-Code enthält keinen gültigen Zugangsschlüssel." : "The QR code does not contain a valid access key." });
    }
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !detectorClass || scanning || processing) return;
    setProcessing(true);
    setMessage(null);
    let image: ImageBitmap | null = null;
    try {
      image = await createImageBitmap(file);
      const results = await new detectorClass({ formats: ["qr_code"] }).detect(image);
      if (results[0]) await unlockValue(results[0].rawValue);
      else setMessage({ tone: "bad", text: de ? "In diesem Bild wurde kein QR-Code gefunden." : "No QR code was found in that image." });
    } catch {
      setMessage({ tone: "bad", text: de ? "Das QR-Bild konnte nicht gelesen werden." : "The QR image could not be read." });
    } finally {
      image?.close();
      event.target.value = "";
      setProcessing(false);
    }
  };
  const camera = async () => {
    if (!detectorClass || !video.current || scanning || processing) return;
    stopCamera();
    const runId = scanRun.current;
    setScanning(true);
    setMessage(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (runId !== scanRun.current) {
        stream.current.getTracks().forEach((track) => track.stop());
        return;
      }
      video.current.srcObject = stream.current;
      await video.current.play();
      const detector = new detectorClass({ formats: ["qr_code"] });
      for (let attempt = 0; attempt < 60 && stream.current && runId === scanRun.current; attempt += 1) {
        const results = await detector.detect(video.current);
        if (results[0]) {
          stopCamera();
          await unlockValue(results[0].rawValue);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      if (runId === scanRun.current) {
        setMessage({ tone: "bad", text: de ? "Kein QR-Code erkannt. Versuche es mit einem hochgeladenen Foto." : "No QR code detected. Try an uploaded photo." });
      }
    } catch {
      setMessage({ tone: "bad", text: de ? "Kein Kamerazugriff möglich. Du kannst stattdessen ein QR-Bild hochladen." : "Camera access is unavailable. You can upload a QR image instead." });
    } finally {
      if (runId === scanRun.current) stopCamera();
    }
  };
  return (
    <section className="card qr-scanner">
      <h2>{de ? "Zugangsschlüssel scannen" : "Scan an access key"}</h2>
      {detectorClass ? (
        <>
          <div className="form-actions">
            <label className="btn btn-outline btn-sm" aria-disabled={scanning || processing}>
              {processing ? (de ? "Bild wird gelesen…" : "Reading image…") : (de ? "QR-Bild hochladen" : "Upload QR image")}
              <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={upload} disabled={scanning || processing} />
            </label>
            <button className="btn btn-outline btn-sm" type="button" onClick={camera} disabled={scanning || processing}>{de ? "Kamera verwenden" : "Use camera"}</button>
            {scanning ? <button className="btn btn-ghost btn-sm" type="button" onClick={stopCamera}>{de ? "Kamera beenden" : "Cancel camera"}</button> : null}
          </div>
          <video ref={video} muted playsInline hidden={!scanning} aria-label={de ? "Kameravorschau des QR-Scanners" : "QR scanner camera preview"} />
        </>
      ) : <p>{de ? "Dein Browser unterstützt keine QR-Erkennung. Gib den Schlüssel in der Admin-Seitenleiste ein." : "Your browser does not support QR detection. Enter the key in the admin sidebar."}</p>}
      {message ? <p className={`notice notice-${message.tone}`} role={message.tone === "bad" ? "alert" : "status"}>{message.text}</p> : null}
    </section>
  );
}

export function AccessKeysPanel() {
  const data = useData();
  const session = useSession();
  const locale = useCurrentLocale();
  const de = locale === "de";
  const state = useAsync(() => data.getAccessKeys(), [data]);
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState(dateTimeLocalTomorrow);
  const [created, setCreated] = useState<CreatedAccessKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ item: AccessKeyInfo; action: "revoke" | "expire" } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(interval);
  }, []);
  if (state.loading && !state.data) return <Loading />;
  if (state.error || !state.data) return <ErrorState error={state.error} onRetry={state.reload} />;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(null);
    try { const result = await data.createAccessKey({ label, scopes, expiresAt: fromDateTimeLocal(expiresAt) ?? expiresAt }); setCreated(result); setLabel(""); setScopes([]); state.reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : de ? "Der Schlüssel konnte nicht erstellt werden." : "Key creation failed."); }
    finally { setBusy(false); }
  };
  const update = async () => {
    if (!pendingAction || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (pendingAction.action === "revoke") await data.revokeAccessKey(pendingAction.item.id);
      else await data.expireAccessKey(pendingAction.item.id);
      setPendingAction(null);
      await session.refresh();
      state.reload();
    } catch (reason) {
      setPendingAction(null);
      setActionError(reason instanceof Error ? reason.message : de ? "Der Zugangsschlüssel konnte nicht aktualisiert werden." : "Access key update failed.");
    } finally {
      setActionBusy(false);
    }
  };
  const effectiveStatus = (item: AccessKeyInfo) => item.status === "active" && new Date(item.expiresAt).getTime() <= now ? "expired" : item.status;
  const actions = (item: AccessKeyInfo) => effectiveStatus(item) === "active" ? <div className="form-actions"><button type="button" className="btn btn-outline btn-sm" disabled={actionBusy} onClick={() => { setActionError(null); setPendingAction({ item, action: "expire" }); }}>{de ? "Jetzt ablaufen lassen" : "Expire now"}</button><button type="button" className="btn btn-danger btn-sm" disabled={actionBusy} onClick={() => { setActionError(null); setPendingAction({ item, action: "revoke" }); }}>{de ? "Widerrufen" : "Revoke"}</button></div> : null;
  const scopeNames = (item: AccessKeyInfo) => item.scopes.map((scope) => capabilityLabel(scope, locale)).join(", ");
  const expiresLabel = (item: AccessKeyInfo) => new Date(item.expiresAt).toLocaleString(locale);
  const card = (item: AccessKeyInfo) => <><small>{item.prefix}...</small><h3>{item.label || (de ? "Schlüssel ohne Namen" : "Unlabelled key")}</h3><StatusBadge status={effectiveStatus(item)} /><p>{scopeNames(item)}</p><time dateTime={item.expiresAt}>{expiresLabel(item)}</time>{actions(item)}</>;
  const qrUrl = created ? accessKeyActivationUrl(created.secret) : "";
  return <><PageHeader kicker="Admin" title={de ? "Zugangsschlüssel" : "Access keys"} sub={de ? "Geheimnisse werden nur einmal angezeigt. Bestehende Schlüssel bleiben immer maskiert." : "Secrets are shown only once. Existing keys are always masked."} />{created ? <section className="card created-key" role="status"><div><h2>{de ? "Speichere diesen Schlüssel jetzt" : "Store this key now"}</h2><code>{created.secret}</code><p>{de ? "Dieses Geheimnis kann nicht erneut angezeigt werden." : "This secret cannot be displayed again."}</p></div><QRCodeSVG value={qrUrl} size={190} bgColor="#fffdfb" fgColor="#111827" level="M" marginSize={2} title={de ? "QR-Code des Zugangsschlüssels" : "Access key QR code"} /></section> : null}<form className="card public-form" onSubmit={submit}><div className="form-grid"><Field label={de ? "Bezeichnung" : "Label"}><input value={label} onChange={(event) => setLabel(event.target.value)} /></Field><Field label={de ? "Läuft ab (Europe/Berlin)" : "Expires (Europe/Berlin)"}><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></Field></div><fieldset><legend>{de ? "Berechtigungen" : "Scopes"}</legend><div className="scope-grid">{state.data.availableScopes.map((scope) => <label className="check-row" key={scope.value}><input type="checkbox" checked={scopes.includes(scope.value)} onChange={(event) => setScopes(event.target.checked ? [...scopes, scope.value] : scopes.filter((value) => value !== scope.value))} />{capabilityLabel(scope.value, locale, { [scope.value]: scope.label })}</label>)}</div></fieldset>{error ? <p className="notice notice-bad" role="alert">{error}</p> : null}<button className="btn btn-primary" type="submit" disabled={busy || !scopes.length}>{busy ? (de ? "Wird erstellt…" : "Creating…") : (de ? "Schlüssel erstellen" : "Create key")}</button></form><QrScanner />{actionError ? <p className="notice notice-bad" role="alert">{actionError}</p> : null}<DataViews items={state.data.items} keyFor={(item) => item.id} columns={de ? ["Präfix", "Bezeichnung", "Berechtigungen", "Status", "Läuft ab", "Aktionen"] : ["Prefix", "Label", "Scopes", "Status", "Expires", "Actions"]} renderCells={(item) => [`${item.prefix}...`, item.label || "-", scopeNames(item), <StatusBadge status={effectiveStatus(item)} />, expiresLabel(item), actions(item)]} renderCard={card} empty={de ? "Keine erstellten Zugangsschlüssel." : "No generated access keys."} /><ConfirmDialog open={pendingAction !== null} title={pendingAction?.action === "revoke" ? (de ? "Zugangsschlüssel widerrufen?" : "Revoke access key?") : (de ? "Zugangsschlüssel jetzt ablaufen lassen?" : "Expire access key now?")} body={pendingAction ? (de ? `${pendingAction.item.label || pendingAction.item.prefix} gewährt ab sofort keinen Zugang mehr.` : `${pendingAction.item.label || pendingAction.item.prefix} will stop granting access immediately.`) : undefined} confirmLabel={actionBusy ? (de ? "Wird aktualisiert…" : "Updating…") : pendingAction?.action === "revoke" ? (de ? "Schlüssel widerrufen" : "Revoke key") : (de ? "Schlüssel ablaufen lassen" : "Expire key")} danger onConfirm={() => void update()} onCancel={() => !actionBusy && setPendingAction(null)} /></>;
}
