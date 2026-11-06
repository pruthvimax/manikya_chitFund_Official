import React, { useState } from "react";
import { Text, View } from "react-native";
import { Btn, Card, Chips, GREEN, INK, MUTED, MoreScreen, Pill, RED, SectionTitle, State, api, ask, say, useFetch } from "../../components/moreKit";

/* DAILY SUMMARY: one WhatsApp message to every admin each evening.
   Money collected today, overdue members, pending leave, top collector, tomorrow's auctions.
   It stays OFF until you switch it ON here. */

const TIMES = [
  { key: "18:00", label: "6 PM" },
  { key: "19:00", label: "7 PM" },
  { key: "20:00", label: "8 PM" },
  { key: "21:00", label: "9 PM" },
  { key: "22:00", label: "10 PM" },
];

export default function DailySummary() {
  const { data, loading, refreshing, error, reload } = useFetch<any>("/more/daily-summary");
  const [busy, setBusy] = useState("");
  const [preview, setPreview] = useState("");

  const settings = data?.settings;

  const save = async (patch: any) => {
    setBusy("save");
    try {
      await api("/more/daily-summary", "POST", patch);
      reload();
    } catch (e: any) {
      say("Could not save", e?.message || "Try again");
    } finally {
      setBusy("");
    }
  };

  const showPreview = async () => {
    setBusy("preview");
    try {
      const r = await api("/more/daily-summary/preview");
      setPreview(r.text || "");
    } catch (e: any) {
      say("Could not build the summary", e?.message || "Try again");
    } finally {
      setBusy("");
    }
  };

  const sendNow = () =>
    ask("Send now?", "This sends today's summary to every admin on WhatsApp right now.", "Send", async () => {
      setBusy("send");
      try {
        const r = await api("/more/daily-summary/send", "POST", {});
        setPreview(r.text || "");
        say("Sent", `Delivered to ${r.sent} admin${r.sent === 1 ? "" : "s"}.${r.failed?.length ? `\nFailed: ${r.failed.map((f: any) => f.name).join(", ")}` : ""}`);
      } catch (e: any) {
        say("Not sent", e?.message || "Try again");
      } finally {
        setBusy("");
      }
    });

  return (
    <MoreScreen title="Daily Summary" subtitle="One WhatsApp message to the admins every evening" onRefresh={reload} refreshing={refreshing}>
      <State loading={loading && !data} error={data ? "" : error} onRetry={reload} />

      {settings ? (
        <>
          <Card style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: INK, fontSize: 16 }}>Send daily summary</Text>
                <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>
                  {settings.enabled ? "Sent every day at the time below" : "Switched off - nothing is sent"}
                </Text>
              </View>
              <Pill text={settings.enabled ? "ON" : "OFF"} color={settings.enabled ? GREEN : RED} solid />
            </View>
            <View style={{ marginTop: 12 }}>
              <Btn
                label={settings.enabled ? "Switch OFF" : "Switch ON"}
                kind={settings.enabled ? "outline" : "solid"}
                color={settings.enabled ? RED : GREEN}
                busy={busy === "save"}
                onPress={() => save({ enabled: !settings.enabled })}
              />
            </View>
          </Card>

          <SectionTitle>Time (India time)</SectionTitle>
          <Chips value={settings.time} onChange={(t) => save({ time: t })} options={TIMES} />

          <SectionTitle>Goes to</SectionTitle>
          <Card>
            {(data?.admins || []).length === 0 ? (
              <Text style={{ color: MUTED, fontSize: 12.5 }}>No admin numbers found.</Text>
            ) : (
              (data.admins as any[]).map((a, i) => (
                <View key={a.mobile} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: "#EEF1EF" }}>
                  <Text style={{ color: INK, fontWeight: "800" }}>{a.name || "Admin"}</Text>
                  <Text style={{ color: MUTED }}>{a.mobile}</Text>
                </View>
              ))
            )}
            <Text style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>
              With the Twilio WhatsApp sandbox, each admin must have joined the sandbox, and the message only arrives if they messaged the sandbox in the last 24 hours.
            </Text>
          </Card>

          <SectionTitle>Preview</SectionTitle>
          <Card>
            {preview ? (
              <Text style={{ color: INK, fontSize: 13.5, lineHeight: 20 }}>{preview}</Text>
            ) : (
              <Text style={{ color: MUTED, fontSize: 12.5 }}>Tap "Show today's summary" to see exactly what will be sent.</Text>
            )}
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Btn label="Show today's summary" kind="soft" busy={busy === "preview"} onPress={showPreview} />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Btn label="Send now" icon="send" busy={busy === "send"} onPress={sendNow} />
              </View>
            </View>
          </Card>
        </>
      ) : null}
    </MoreScreen>
  );
}
