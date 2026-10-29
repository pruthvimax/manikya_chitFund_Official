import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Btn, Card, Chips, Field, GREEN, INK, MUTED, MoreScreen, RED, SectionTitle, State, api, ask, fmtDateTime, say, useFetch } from "../../components/moreKit";

/* ANNOUNCEMENT COMPOSER: one phone notification to all members, chosen groups, or overdue members.
   Ready-made messages + the admin's own saved messages (create / edit / delete) fill the Title and Message. */

const READY: { key: string; label: string; title: string; body: string }[] = [
  { key: "r1", label: "Payment reminder", title: "Payment reminder", body: "Your chit installment is due. Please pay at the earliest to avoid penalty. Check My Live Payments in the app for the exact amount." },
  { key: "r2", label: "Penalty warning", title: "Penalty on pending dues", body: "A penalty is being added to your pending installment every month. Please clear your dues soon to stop it growing." },
  { key: "r3", label: "Thank you", title: "Thank you for your payment", body: "We have received your payment. Thank you for paying on time. Your Account Copy in the app is updated." },
  { key: "r4", label: "Auction soon", title: "Auction this month", body: "This month's chit auction is coming up. Please check the Auction Calendar in the app for the date and time and be present." },
  { key: "r5", label: "Auction result", title: "Auction result is out", body: "This month's auction is completed. Open the app to see the winner, the discount and your new dividend." },
  { key: "r6", label: "Office holiday", title: "Office closed", body: "Our office will remain closed tomorrow on account of a holiday. Payments can be made in the app or on the next working day." },
  { key: "r7", label: "Festival wishes", title: "Festival greetings", body: "Wishing you and your family a very happy and prosperous festival from all of us at Manikya Chits." },
  { key: "r8", label: "New group", title: "New chit group starting", body: "A new chit group is about to start. Interested? Contact the office or open the app to join." },
  { key: "r9", label: "Get your receipt", title: "Always take your receipt", body: "When you pay cash to our staff, please check that the payment is shown in your app and keep the receipt safe." },
  { key: "r10", label: "Update the app", title: "Please update the app", body: "A new version of the Manikya Chits app is available with improvements. Please update it from the store." },
];

export default function Announce() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "groups" | "overdue">("all");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const groups = useFetch<any>("/more/announce/groups");
  const hist = useFetch<any>("/more/announce/history");
  const tpl = useFetch<any>("/more/announce/templates");
  const mine: any[] = tpl.data?.items || [];

  const ids = Object.keys(picked).filter((k) => picked[k]);
  const toggle = (id: string) => setPicked((p) => ({ ...p, [id]: !p[id] }));

  const who =
    audience === "all"
      ? "all members"
      : audience === "overdue"
      ? ids.length
        ? `overdue members of ${ids.length} group(s)`
        : "members with overdue payments (all groups)"
      : `${ids.length} group(s)`;

  const use = (t: string, b: string) => {
    setTitle(t);
    setBody(b);
    setEditId("");
  };

  const send = () => {
    if (!title.trim() || !body.trim()) return say("Write the message", "Both the title and the message are needed.");
    if (audience === "groups" && ids.length === 0) return say("Choose groups", "Tick at least one group.");
    ask("Send announcement", `Send this to ${who}? It reaches their phones at once and cannot be taken back.`, "Send", async () => {
      setBusy(true);
      try {
        const r = await api("/more/announce", "POST", { title: title.trim(), body: body.trim(), audience, groupIds: ids });
        say("Sent", `${r.sent} phone(s) notified (${r.members} members in the audience).`);
        setTitle("");
        setBody("");
        setEditId("");
        setPicked({});
        hist.silent();
      } catch (e: any) {
        say("Not sent", e?.message || "Try again");
      } finally {
        setBusy(false);
      }
    });
  };

  const saveMine = async (asNew: boolean) => {
    if (!title.trim() || !body.trim()) return say("Write the message", "Both the title and the message are needed to save it.");
    setSaving(true);
    try {
      await api("/more/announce/templates", "POST", { id: asNew ? "" : editId, title: title.trim(), body: body.trim() });
      say(editId && !asNew ? "Updated" : "Saved", editId && !asNew ? "Your saved message is updated." : "Added to My saved messages.");
      if (asNew) setEditId("");
      tpl.reload();
    } catch (e: any) {
      say("Not saved", e?.message || "Try again");
    } finally {
      setSaving(false);
    }
  };

  const removeMine = (t: any) =>
    ask("Delete saved message", `Delete "${t.title}" from your saved messages? Messages already sent are not affected.`, "Delete", async () => {
      try {
        await api(`/more/announce/templates/${t._id}`, "DELETE");
        if (editId === t._id) setEditId("");
        tpl.reload();
      } catch (e: any) {
        say("Not deleted", e?.message || "Try again");
      }
    });

  const removeSent = (h: any) =>
    ask("Delete sent announcement", `Delete "${h.title}" from this list? It will also disappear from the members' notification page. Phones that already received the push keep it.`, "Delete", async () => {
      try {
        await api(`/more/announce/history/${h._id}`, "DELETE");
        hist.reload();
      } catch (e: any) {
        say("Not deleted", e?.message || "Try again");
      }
    });

  const pill = (key: string, label: string, onPress: () => void, mineStyle?: boolean) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginRight: 8, backgroundColor: mineStyle ? "#FFF8E1" : "#F3F6F4", borderWidth: 1, borderColor: mineStyle ? "#E6C65C" : "#DDE5E0" }}
    >
      <Text style={{ fontWeight: "800", fontSize: 12.5, color: INK }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <MoreScreen
      title="Announcements"
      subtitle="Notify members' phones"
      onRefresh={() => {
        groups.reload();
        hist.reload();
        tpl.reload();
      }}
      refreshing={groups.refreshing}
    >
      <Card>
        <Chips
          value={audience}
          onChange={setAudience}
          options={[
            { key: "all", label: "All members" },
            { key: "groups", label: "Chosen groups" },
            { key: "overdue", label: "Overdue members" },
          ]}
        />
        {audience === "groups" || audience === "overdue" ? (
          <View style={{ marginBottom: 6 }}>
            {audience === "overdue" ? (
              <Text style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>
                Tick a group to send only to the overdue members of that group. Leave all unticked to send to the overdue members of every group.
              </Text>
            ) : null}
            <State loading={groups.loading && !groups.data} error={groups.data ? "" : groups.error} onRetry={groups.reload} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(groups.data?.items || []).map((g: any) => {
                const on = !!picked[g._id];
                return (
                  <TouchableOpacity
                    key={g._id}
                    onPress={() => toggle(g._id)}
                    style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: on ? GREEN : "#F3F6F4", borderWidth: 1, borderColor: on ? GREEN : "#DDE5E0" }}
                  >
                    <MaterialIcons name={on ? "check-circle" : "radio-button-unchecked"} size={15} color={on ? "#FFFFFF" : MUTED} />
                    <Text style={{ marginLeft: 5, fontWeight: "800", fontSize: 12.5, color: on ? "#FFFFFF" : INK }}>{g.groupId} ({g.members})</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        <Text style={{ fontSize: 11, fontWeight: "800", color: MUTED, marginTop: 12, marginBottom: 6 }}>QUICK MESSAGES · tap one to fill the boxes below</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {mine.map((t) => pill(t._id, t.title, () => use(t.title, t.body), true))}
          {READY.map((t) => pill(t.key, t.label, () => use(t.title, t.body)))}
        </ScrollView>

        {editId ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, backgroundColor: "#FFF8E1", borderRadius: 10, padding: 8 }}>
            <MaterialIcons name="edit" size={15} color="#92400E" />
            <Text style={{ flex: 1, marginLeft: 6, color: "#92400E", fontWeight: "800", fontSize: 12 }}>Editing one of your saved messages</Text>
            <TouchableOpacity onPress={() => use("", "")}>
              <Text style={{ color: "#92400E", fontWeight: "900", fontSize: 12 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Office closed on Monday" maxLength={60} />
        <Field label="Message" value={body} onChangeText={setBody} placeholder="Write the message members will see" multiline maxLength={240} />
        <Text style={{ color: MUTED, fontSize: 11, textAlign: "right", marginTop: 3 }}>{body.length}/240</Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {editId ? (
            <>
              <View style={{ flex: 1 }}>
                <Btn label="Update saved" icon="check" kind="soft" small onPress={() => saveMine(false)} busy={saving} disabled={!title.trim() || !body.trim()} />
              </View>
              <View style={{ flex: 1 }}>
                <Btn label="Save as new" icon="bookmark-add" kind="outline" small onPress={() => saveMine(true)} busy={saving} disabled={!title.trim() || !body.trim()} />
              </View>
            </>
          ) : (
            <View style={{ flex: 1 }}>
              <Btn label="Save as my message" icon="bookmark-add" kind="outline" small onPress={() => saveMine(true)} busy={saving} disabled={!title.trim() || !body.trim()} />
            </View>
          )}
        </View>

        {groups.data ? <Text style={{ color: MUTED, fontSize: 11.5, marginTop: 10 }}>{groups.data.phones} phones have notifications on.</Text> : null}
        <View style={{ marginTop: 10 }}>
          <Btn label={`Send to ${who}`} icon="send" onPress={send} busy={busy} disabled={!title.trim() || !body.trim()} />
        </View>
        <Text style={{ color: MUTED, fontSize: 11, marginTop: 8 }}>Members get it in the phone's notification bar and also see it in the Notices tab of their app's notification page.</Text>
      </Card>

      <SectionTitle>My saved messages</SectionTitle>
      <State loading={tpl.loading && !tpl.data} error={tpl.data ? "" : tpl.error} empty={!!tpl.data && mine.length === 0} emptyText="Nothing saved yet. Write a message above and press “Save as my message”." onRetry={tpl.reload} />
      {mine.map((t) => (
        <Card key={t._id} style={{ marginTop: 10 }}>
          <TouchableOpacity onPress={() => use(t.title, t.body)} activeOpacity={0.7}>
            <Text style={{ fontWeight: "900", color: INK }}>{t.title}</Text>
            <Text style={{ color: INK, marginTop: 3, fontSize: 13 }}>{t.body}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 18, marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => {
                setTitle(t.title);
                setBody(t.body);
                setEditId(t._id);
              }}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <MaterialIcons name="edit" size={17} color={GREEN} />
              <Text style={{ marginLeft: 4, color: GREEN, fontWeight: "800", fontSize: 12.5 }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeMine(t)} style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialIcons name="delete-outline" size={18} color={RED} />
              <Text style={{ marginLeft: 4, color: RED, fontWeight: "800", fontSize: 12.5 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}

      <SectionTitle>Sent earlier</SectionTitle>
      <State loading={hist.loading && !hist.data} error={hist.data ? "" : hist.error} empty={!!hist.data && (hist.data.items || []).length === 0} emptyText="Nothing sent yet." onRetry={hist.reload} />
      {(hist.data?.items || []).map((h: any) => (
        <Card key={h._id} style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: "900", color: INK }}>{h.title}</Text>
          <Text style={{ color: INK, marginTop: 3, fontSize: 13 }}>{h.body}</Text>
          <Text style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>
            {fmtDateTime(h.createdAt)} · {(h.groups || []).slice(0, 4).join(", ")} · {h.sent} phones
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 18, marginTop: 8 }}>
            <TouchableOpacity onPress={() => use(h.title, h.body)} style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialIcons name="replay" size={17} color={GREEN} />
              <Text style={{ marginLeft: 4, color: GREEN, fontWeight: "800", fontSize: 12.5 }}>Use again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeSent(h)} style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialIcons name="delete-outline" size={18} color={RED} />
              <Text style={{ marginLeft: 4, color: RED, fontWeight: "800", fontSize: 12.5 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </MoreScreen>
  );
}
