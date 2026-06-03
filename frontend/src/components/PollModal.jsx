import { useState } from "react";
import { useTranslate } from "../hooks/useTranslate.js";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import axios from "../lib/axios.js";

export default function PollModal({ conversationId, onClose }) {
  const t = useTranslate();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [sending, setSending] = useState(false);

  const addOption = () => setOptions([...options, ""]);
  const removeOption = (i) => options.length > 2 && setOptions(options.filter((_, idx) => idx !== i));
  const setOption = (i, v) => {
    const next = [...options];
    next[i] = v;
    setOptions(next);
  };

  const handleCreate = async () => {
    if (!question.trim() || options.some((o) => !o.trim()) || sending) return;
    setSending(true);
    try {
      await axios.post("/groups/polls", {
        conversationId,
        question: question.trim(),
        options: options.map((o) => o.trim()),
        isAnonymous,
        isMultipleChoice,
      });
      onClose();
    } catch (err) {
      console.error("Failed to create poll:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t("chat.createPoll", "Create Poll")}</h2>
          <button onClick={onClose}><X size={22} /></button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label>{t("chat.question", "Question")}</label>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("chat.askSomething", "Ask something...")} />
          </div>
          {options.map((opt, i) => (
            <div key={i} className="poll-option-row">
              <input value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={t("chat.option", "Option {n}").replace("{n}", String(i + 1))} />
              {options.length > 2 && (
                <button className="icon-btn" onClick={() => removeOption(i)}><Trash2 size={16} /></button>
              )}
            </div>
          ))}
          <button className="btn-secondary" onClick={addOption} style={{ width: "100%", marginTop: 8 }}>
            <Plus size={16} /> {t("chat.addOption", "Add Option")}
          </button>
          <div className="poll-settings" style={{ marginTop: 12, display: "flex", gap: 16 }}>
            <label><input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} /> {t("chat.anonymous", "Anonymous")}</label>
            <label><input type="checkbox" checked={isMultipleChoice} onChange={(e) => setIsMultipleChoice(e.target.checked)} /> {t("chat.multipleChoice", "Multiple choice")}</label>
          </div>
          <button className="btn-primary" onClick={handleCreate} disabled={sending || !question.trim() || options.some((o) => !o.trim())} style={{ marginTop: 16 }}>
            {sending ? <Loader2 size={16} className="spin" /> : t("chat.createPoll", "Create Poll")}
          </button>
        </div>
      </div>
    </div>
  );
}
