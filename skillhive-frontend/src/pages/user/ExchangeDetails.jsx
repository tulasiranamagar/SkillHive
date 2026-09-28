import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Handshake,
  Loader2,
  MessageCircle,
  Send,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import api from "../../api/axios";

function formatDateTime(value) {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    dateStyle: "full",
    timeStyle: "short",
  });
}

function getCreatorName(creator) {
  if (!creator) return "Unknown user";

  return (
    creator.full_name ||
    `${creator.first_name || ""} ${creator.last_name || ""}`.trim() ||
    creator.username ||
    "Unknown user"
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-blue-50 text-blue-700 border-blue-200",
    accepted: "bg-blue-50 text-blue-700 border-blue-200",
    rejected: "bg-blue-50 text-blue-700 border-blue-200",
    cancelled: "bg-blue-50 text-blue-700 border-blue-200",
    open: "bg-blue-50 text-blue-700 border-blue-200",
    closed: "bg-blue-50 text-blue-700 border-blue-200",
    cancelled_post: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${
        styles[status] ||
        "border-blue-200 bg-blue-50 text-blue-600"
      }`}
    >
      {status?.replace("_", " ") || "Unknown"}
    </span>
  );
}

function RequestCard({
  request,
  incoming,
  processing,
  onAccept,
  onReject,
  onCancel,
}) {
  const person = incoming ? request.requester : request.recipient;

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <UserRound size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-blue-950">
                {person?.full_name ||
                  `${person?.first_name || ""} ${
                    person?.last_name || ""
                  }`.trim() ||
                  person?.username ||
                  "User"}
              </p>

              {person?.username && (
                <p className="text-xs text-blue-500">
                  @{person.username}
                </p>
              )}
            </div>

            <StatusBadge status={request.status} />
          </div>

          {request.message && (
            <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-700">
              {request.message}
            </div>
          )}

          {request.status === "pending" && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {incoming ? (
                <>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onAccept(request.id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {processing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Accept
                  </button>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => onReject(request.id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60"
                  >
                    <X size={16} />
                    Reject
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => onCancel(request.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50 disabled:opacity-60"
                >
                  {processing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  Cancel request
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExchangeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exchange, setExchange] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [cancellingExchange, setCancellingExchange] = useState(false);

  const [createdSession, setCreatedSession] = useState(null);
  const [error, setError] = useState("");

  const loadExchange = async () => {
    const response = await api.get(`/api/exchanges/posts/${id}/`);
    setExchange(response.data);
  };

  const loadCurrentUser = async () => {
    try {
      const response = await api.get("/api/accounts/me/");
      setCurrentUser(response.data?.data || response.data?.user || response.data);
    } catch {
      setCurrentUser(null);
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);

    try {
      const [sentResponse, receivedResponse] = await Promise.all([
        api.get("/api/exchanges/requests/sent/"),
        api.get("/api/exchanges/requests/received/"),
      ]);

      const sent = Array.isArray(sentResponse.data)
        ? sentResponse.data
        : [];

      const received = Array.isArray(receivedResponse.data)
        ? receivedResponse.data
        : [];

      setSentRequests(
        sent.filter((request) => String(request.post?.id) === String(id))
      );

      setReceivedRequests(
        received.filter(
          (request) => String(request.post?.id) === String(id)
        )
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to load exchange requests."
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        await Promise.all([
          loadExchange(),
          loadCurrentUser(),
          loadRequests(),
        ]);
      } catch (err) {
        setError(
          err?.response?.data?.detail ||
            "Unable to load this exchange."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const isOwner = useMemo(() => {
    if (!exchange || !currentUser) return false;

    return String(exchange.creator?.id) === String(currentUser.id);
  }, [exchange, currentUser]);

  const myRequest = sentRequests[0] || null;

  const canRequest =
    !isOwner &&
    exchange?.status === "open" &&
    !["pending", "accepted"].includes(
      exchange?.my_request_status
    );

  const sendRequest = async () => {
    if (!exchange || sending) return;

    setSending(true);
    setError("");

    try {
      await api.post("/api/exchanges/requests/create/", {
        post_id: exchange.id,
        message: message.trim(),
      });

      setMessage("");

      await Promise.all([loadExchange(), loadRequests()]);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to send the exchange request."
      );
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (requestId) => {
    setProcessingId(requestId);
    setError("");

    try {
      const response = await api.post(
        `/api/exchanges/requests/${requestId}/accept/`
      );

      if (response.data?.session) {
        setCreatedSession(response.data.session);
      }

      await Promise.all([loadExchange(), loadRequests()]);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to accept this request."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    setError("");

    try {
      await api.post(
        `/api/exchanges/requests/${requestId}/reject/`
      );

      await loadRequests();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to reject this request."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelRequest = async (requestId) => {
    setProcessingId(requestId);
    setError("");

    try {
      await api.post(
        `/api/exchanges/requests/${requestId}/cancel/`
      );

      await Promise.all([loadExchange(), loadRequests()]);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to cancel this request."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelExchange = async () => {
    if (!exchange || cancellingExchange) return;

    const confirmed = window.confirm(
      "Cancel this exchange? People will no longer be able to request it."
    );

    if (!confirmed) return;

    setCancellingExchange(true);
    setError("");

    try {
      await api.delete(`/api/exchanges/posts/${exchange.id}/`);
      navigate("/exchange/");
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to cancel this exchange."
      );
    } finally {
      setCancellingExchange(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-blue-200" />
          <div className="mt-6 h-72 animate-pulse rounded-3xl bg-white" />
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="h-72 animate-pulse rounded-2xl bg-white lg:col-span-2" />
            <div className="h-72 animate-pulse rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (!exchange) {
    return (
      <div className="min-h-screen bg-blue-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-blue-100 bg-white p-8 text-center">
          <XCircle size={30} className="mx-auto text-blue-600" />
          <h1 className="mt-4 text-xl font-bold text-blue-950">
            Exchange not found
          </h1>

          <button
            type="button"
            onClick={() => navigate("/exchange/")}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Back to Exchanges
          </button>
        </div>
      </div>
    );
  }

  const creatorName = getCreatorName(exchange.creator);

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/exchange/")}
          className="mb-5 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-blue-700 transition hover:bg-white hover:text-blue-950"
        >
          <ArrowLeft size={17} />
          Back to exchanges
        </button>

        {error && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-3xl bg-blue-700 shadow-xl">
          <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                    <Handshake size={14} />
                    Skill Exchange
                  </span>

                  <StatusBadge status={exchange.status} />
                </div>

                <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {exchange.title}
                </h1>

                {exchange.description && (
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-100 sm:text-base">
                    {exchange.description}
                  </p>
                )}
              </div>

              {isOwner && exchange.status === "open" && (
                <button
                  type="button"
                  disabled={cancellingExchange}
                  onClick={handleCancelExchange}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200/30 bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
                >
                  {cancellingExchange ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  Cancel Exchange
                </button>
              )}
            </div>

            <div className="mt-8 flex flex-col gap-4 border-t border-white/20 pt-6 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white">
                <UserRound size={19} />
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  {creatorName}
                </p>

                {exchange.creator?.username && (
                  <p className="text-xs text-blue-100">
                    @{exchange.creator.username}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <main className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Exchange
                </p>
                <h2 className="mt-1 text-xl font-bold text-blue-950">
                  What both people bring
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Can share
                  </p>

                  <p className="mt-2 break-words text-xl font-bold text-blue-950">
                    {exchange.offered_skill_name}
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-500">
                    <ArrowRight size={18} />
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Wants to learn
                  </p>

                  <p className="mt-2 break-words text-xl font-bold text-blue-950">
                    {exchange.requested_skill_name}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Schedule
                </p>
                <h2 className="mt-1 text-xl font-bold text-blue-950">
                  Session details
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <CalendarDays size={17} />
                    <span className="text-xs font-semibold">
                      Scheduled for
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-bold leading-6 text-blue-950">
                    {formatDateTime(exchange.scheduled_at)}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Clock3 size={17} />
                    <span className="text-xs font-semibold">
                      Duration
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-bold text-blue-950">
                    {exchange.duration_minutes} minutes
                  </p>
                </div>
              </div>
            </section>

            {isOwner && (
              <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Requests
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-blue-950">
                      People interested in this exchange
                    </h2>
                  </div>

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">
                    {receivedRequests.length}
                  </span>
                </div>

                {requestsLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-blue-600">
                    <Loader2 size={17} className="animate-spin" />
                    Loading requests...
                  </div>
                ) : receivedRequests.length === 0 ? (
                  <div className="rounded-xl bg-blue-50 px-5 py-10 text-center">
                    <MessageCircle
                      size={23}
                      className="mx-auto text-blue-300"
                    />
                    <p className="mt-3 text-sm font-medium text-blue-700">
                      No requests yet.
                    </p>
                    <p className="mt-1 text-xs text-blue-500">
                      Requests from other users will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receivedRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        incoming
                        processing={processingId === request.id}
                        onAccept={handleAccept}
                        onReject={handleReject}
                        onCancel={handleCancelRequest}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {!isOwner && myRequest && (
              <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Your request
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-blue-950">
                    Request status
                  </h2>
                </div>

                <RequestCard
                  request={myRequest}
                  incoming={false}
                  processing={processingId === myRequest.id}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onCancel={handleCancelRequest}
                />
              </section>
            )}

            {createdSession && (
              <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Check size={21} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-blue-950">
                      Exchange accepted
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-blue-800">
                      Your skill session has been created successfully.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/sessions/${createdSession.id}`)
                      }
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
                    >
                      Open Session
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </section>
            )}
          </main>

          <aside className="lg:col-span-1">
            {!isOwner &&
              exchange.status === "open" &&
              !["pending", "accepted"].includes(
                exchange.my_request_status
              ) && (
                <div className="sticky top-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Send size={18} />
                    </div>

                    <h2 className="mt-4 text-lg font-bold text-blue-950">
                      Interested in this exchange?
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-blue-600">
                      Send a request to the exchange creator.
                    </p>
                  </div>

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write a short message..."
                    rows={5}
                    className="w-full resize-none rounded-xl border border-blue-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                  <button
                    type="button"
                    onClick={sendRequest}
                    disabled={sending}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Send size={17} />
                    )}
                    {sending ? "Sending..." : "Send Request"}
                  </button>
                </div>
              )}

            {!isOwner &&
              exchange.status === "open" &&
              exchange.my_request_status === "pending" && (
                <div className="sticky top-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Clock3 size={18} />
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-blue-950">
                    Request pending
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-blue-800">
                    Your request has been sent. The exchange creator needs
                    to accept it.
                  </p>
                </div>
              )}

            {!isOwner &&
              exchange.my_request_status === "accepted" && (
                <div className="sticky top-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Check size={18} />
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-blue-950">
                    Request accepted
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-blue-800">
                    Your exchange request was accepted and a session was
                    created.
                  </p>
                </div>
              )}

            {!isOwner && exchange.status !== "open" && (
              <div className="sticky top-6 rounded-2xl border border-blue-100 bg-white p-5 sm:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Handshake size={18} />
                </div>

                <h2 className="mt-4 text-lg font-bold text-blue-950">
                  Exchange closed
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-600">
                  This exchange is no longer accepting new requests.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

