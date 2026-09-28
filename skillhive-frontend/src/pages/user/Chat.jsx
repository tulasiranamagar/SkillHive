import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  Check,
  CheckCheck,
  Edit3,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Search,
  Send,
  Smile,
  Trash2,
  User,
  X,
} from "lucide-react";

import EmojiPicker from "emoji-picker-react";
import { useSearchParams } from "react-router-dom";

import api from "../../api/axios";
import { useAuth } from "../../hooks/useAuth";



function unwrap(response) {
  const data = response?.data;

  if (data?.data !== undefined) {
    return data.data;
  }

  return data;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  if (Array.isArray(value?.users)) {
    return value.users;
  }

  if (Array.isArray(value?.conversations)) {
    return value.conversations;
  }

  if (Array.isArray(value?.messages)) {
    return value.messages;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.data?.results)) {
    return value.data.results;
  }

  if (Array.isArray(value?.data?.users)) {
    return value.data.users;
  }

  return [];
}

function extractError(
  error,
  fallback = "Something went wrong."
) {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  if (
    data.errors &&
    typeof data.errors === "object"
  ) {
    return Object.values(data.errors)
      .flat()
      .filter(Boolean)
      .join(" ");
  }

  if (data.participant_id) {
    if (Array.isArray(data.participant_id)) {
      return data.participant_id.join(" ");
    }

    return String(data.participant_id);
  }

  return fallback;
}


function getId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (typeof value === "object") {
    if (
      value.user &&
      typeof value.user === "object"
    ) {
      const nestedUserId =
        value.user.id ??
        value.user.pk ??
        value.user.user_id ??
        value.user.userId;

      if (
        nestedUserId !== null &&
        nestedUserId !== undefined
      ) {
        return nestedUserId;
      }
    }

    if (
      value.user !== null &&
      value.user !== undefined &&
      typeof value.user !== "object"
    ) {
      return value.user;
    }

    if (
      value.user_id !== null &&
      value.user_id !== undefined
    ) {
      return value.user_id;
    }

    if (
      value.userId !== null &&
      value.userId !== undefined
    ) {
      return value.userId;
    }

    if (
      value.profile?.user &&
      typeof value.profile.user === "object"
    ) {
      const nestedProfileUserId =
        value.profile.user.id ??
        value.profile.user.pk ??
        value.profile.user.user_id ??
        value.profile.user.userId;

      if (
        nestedProfileUserId !== null &&
        nestedProfileUserId !== undefined
      ) {
        return nestedProfileUserId;
      }
    }

    if (
      value.profile?.user !== null &&
      value.profile?.user !== undefined &&
      typeof value.profile.user !== "object"
    ) {
      return value.profile.user;
    }

    if (
      value.id !== null &&
      value.id !== undefined
    ) {
      return value.id;
    }

    if (
      value.pk !== null &&
      value.pk !== undefined
    ) {
      return value.pk;
    }
  }

  return null;
}

function getPersonName(person) {
  return (
    person?.name ||
    person?.full_name ||
    person?.fullName ||
    person?.display_name ||
    person?.displayName ||
    person?.username ||
    person?.user?.name ||
    person?.user?.full_name ||
    person?.user?.fullName ||
    person?.user?.display_name ||
    person?.user?.displayName ||
    person?.user?.username ||
    "SkillHive User"
  );
}

function getPersonUsername(person) {
  return (
    person?.username ||
    person?.user?.username ||
    null
  );
}

function getPersonAvatar(person) {
  return (
    person?.profile_picture ||
    person?.avatar ||
    person?.profile_image ||
    person?.profileImage ||
    person?.avatar_url ||
    person?.avatarUrl ||
    person?.user?.profile_picture ||
    person?.user?.avatar ||
    person?.user?.profile_image ||
    person?.user?.profileImage ||
    person?.user?.avatar_url ||
    person?.user?.avatarUrl ||
    null
  );
}


function getConversationParticipants(
  conversation
) {
  return (
    conversation?.participants ||
    conversation?.members ||
    conversation?.users ||
    []
  );
}

function normalizeConversation(
  item,
  currentUserId
) {
  const participants = asArray(
    getConversationParticipants(item)
  );

  const otherParticipant =
    participants.find(
      (participant) =>
        String(getId(participant)) !==
        String(currentUserId)
    ) || participants[0];

  const participantSource =
    otherParticipant ||
    item?.other_user ||
    item?.otherUser ||
    item?.recipient ||
    item?.user ||
    null;

  return {
    id:
      item?.id ??
      item?.pk ??
      item?.conversation_id ??
      null,

    name:
      item?.name ||
      getPersonName(participantSource),

    username:
      item?.username ||
      getPersonUsername(participantSource),

    avatar:
      item?.avatar ||
      item?.profile_picture ||
      getPersonAvatar(participantSource),

    participants,

    lastMessage:
      item?.last_message?.content ||
      item?.last_message?.text ||
      item?.last_message ||
      item?.lastMessage ||
      "",

    lastMessageAt:
      item?.last_message?.created_at ||
      item?.last_message?.createdAt ||
      item?.last_message_at ||
      item?.updated_at ||
      item?.created_at ||
      null,

    unreadCount: Number(
      item?.unread_count ??
      item?.unreadCount ??
      0
    ),

    raw: item,
  };
}

function normalizeMessage(item) {
  const sender =
    item?.sender ||
    item?.author ||
    item?.user ||
    null;

  const senderId =
    item?.sender_id ??
    item?.author_id ??
    getId(sender);

  return {
    id:
      item?.id ??
      item?.pk ??
      item?.message_id ??
      null,

    conversationId:
      item?.conversation_id ??
      item?.conversation ??
      null,

    senderId,

    senderName:
      getPersonName(sender),

    content:
      item?.content ??
      item?.message ??
      item?.text ??
      "",

    createdAt:
      item?.created_at ??
      item?.createdAt ??
      item?.timestamp ??
      null,

    isRead: Boolean(
      item?.is_read ??
      item?.read ??
      item?.read_at
    ),

    edited: Boolean(
      item?.is_edited ??
      item?.edited ??
      item?.edited_at
    ),

    deleted: Boolean(
      item?.is_deleted ??
      item?.deleted
    ),

    attachment:
      item?.attachment ??
      item?.file ??
      null,

    raw: item,
  };
}


function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatConversationTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  if (
    date.toDateString() ===
    now.toDateString()
  ) {
    return formatTime(value);
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}


function Avatar({
  name,
  src,
  size = "md",
}) {
  const sizeClass =
    size === "xl"
      ? "h-12 w-12"
      : size === "lg"
        ? "h-11 w-11"
        : size === "sm"
          ? "h-9 w-9"
          : "h-10 w-10";

  const iconSize =
    size === "xl"
      ? "h-6 w-6"
      : size === "lg"
        ? "h-5 w-5"
        : size === "sm"
          ? "h-4 w-4"
          : "h-5 w-5";

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-blue-600`}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        <User className={iconSize} />
      )}
    </div>
  );
}


function Chat() {
  const { user } = useAuth();

  const [searchParams] =
    useSearchParams();

  const targetUsername =
    searchParams
      .get("username")
      ?.trim() || "";

  const currentUserId =
    getId(user) ||
    user?.user_id ||
    user?.id;

  const messagesEndRef =
    useRef(null);

  const textareaRef =
    useRef(null);

  const emojiPickerRef =
    useRef(null);

  const targetOpenedRef =
    useRef(false);

  const usersRequestRef =
    useRef(false);

  const [
    conversations,
    setConversations,
  ] = useState([]);

  const [
    skillHiveUsers,
    setSkillHiveUsers,
  ] = useState([]);

  const [
    usersLoading,
    setUsersLoading,
  ] = useState(false);

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState(null);

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    conversationLoading,
    setConversationLoading,
  ] = useState(true);

  const [
    messagesLoading,
    setMessagesLoading,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    editingMessageId,
    setEditingMessageId,
  ] = useState(null);

  const [
    messageDraft,
    setMessageDraft,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    mobileShowConversation,
    setMobileShowConversation,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    messageError,
    setMessageError,
  ] = useState("");

  const [
    actionMessage,
    setActionMessage,
  ] = useState("");

  const [
    showEmojiPicker,
    setShowEmojiPicker,
  ] = useState(false);

  const [
    showConversationMenu,
    setShowConversationMenu,
  ] = useState(false);

  const [
    openingUserId,
    setOpeningUserId,
  ] = useState(null);


  async function requestFirstAvailable(
    endpoints,
    options = {}
  ) {
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await api({
          url: endpoint,
          method:
            options.method || "GET",
          data: options.data,
        });

        return {
          response,
          data: unwrap(response),
        };
      } catch (requestError) {
        lastError = requestError;
      }
    }

    throw (
      lastError ||
      new Error("Request failed.")
    );
  }



  const loadSkillHiveUsers =
    useCallback(
      async () => {
        if (
          !currentUserId ||
          usersRequestRef.current
        ) {
          return;
        }

        usersRequestRef.current = true;
        setUsersLoading(true);

        try {
          const response =
            await api.get(
              "/api/accounts/users/"
            );

          const data =
            unwrap(response);

          const users =
            asArray(data);

          const normalizedUsers =
            users
              .map((item) => {
                const id =
                  getId(item);

                return {
                  id,
                  name:
                    getPersonName(item),
                  username:
                    getPersonUsername(
                      item
                    ),
                  avatar:
                    getPersonAvatar(
                      item
                    ),
                  raw: item,
                };
              })
              .filter((person) => {
                if (!person.id) {
                  return false;
                }

                if (
                  String(person.id) ===
                  String(currentUserId)
                ) {
                  return false;
                }

                return true;
              });

          const uniqueUsers =
            normalizedUsers.filter(
              (person, index, array) => {
                return (
                  index ===
                  array.findIndex(
                    (item) =>
                      String(
                        item.id
                      ) ===
                      String(
                        person.id
                      )
                  )
                );
              }
            );

          setSkillHiveUsers(
            uniqueUsers
          );
        } catch (requestError) {
          console.error(
            "Could not load SkillHive users:",
            requestError
          );

          setSkillHiveUsers([]);
        } finally {
          setUsersLoading(false);
          usersRequestRef.current =
            false;
        }
      },
      [currentUserId]
    );


  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    loadSkillHiveUsers();
  }, [
    currentUserId,
    loadSkillHiveUsers,
  ]);


  async function findUserByUsername(
    username
  ) {
    if (!username) {
      return null;
    }

    const normalizedUsername =
      String(username)
        .trim()
        .toLowerCase();

    const localMatch =
      skillHiveUsers.find(
        (item) =>
          String(
            item?.username || ""
          ).toLowerCase() ===
          normalizedUsername
      );

    if (localMatch) {
      return (
        localMatch.raw ||
        localMatch
      );
    }

    const response =
      await api.get(
        "/api/accounts/users/"
      );

    const users =
      asArray(
        unwrap(response)
      );

    const target =
      users.find(
        (item) =>
          String(
            getPersonUsername(
              item
            ) || ""
          ).toLowerCase() ===
          normalizedUsername
      );

    return target || null;
  }

  async function openConversationWithUser(
    targetUser,
    loadedConversations = conversations
  ) {
    const targetUserId =
      getId(targetUser);

    if (
      !targetUserId ||
      !currentUserId
    ) {
      return null;
    }

    if (
      String(targetUserId) ===
      String(currentUserId)
    ) {
      throw new Error(
        "You cannot start a conversation with yourself."
      );
    }

    const targetUsernameValue =
      getPersonUsername(
        targetUser
      );

    const existing =
      loadedConversations.find(
        (conversation) => {
          if (
            targetUsernameValue &&
            conversation.username
          ) {
            if (
              String(
                conversation.username
              ).toLowerCase() ===
              String(
                targetUsernameValue
              ).toLowerCase()
            ) {
              return true;
            }
          }

          return getConversationParticipants(
            conversation.raw
          ).some(
            (participant) =>
              String(
                getId(participant)
              ) ===
              String(targetUserId)
          );
        }
      );

    if (existing?.id) {
      return existing;
    }

    try {
      const payload = {
        participant_id:
          targetUserId,
      };

      const response =
        await api.post(
          "/api/chat/conversations/",
          payload
        );

      const conversation =
        normalizeConversation(
          unwrap(response),
          currentUserId
        );

      if (
        !conversation.name ||
        conversation.name ===
          "SkillHive User"
      ) {
        conversation.name =
          getPersonName(
            targetUser
          );
      }

      if (
        !conversation.username &&
        targetUsernameValue
      ) {
        conversation.username =
          targetUsernameValue;
      }

      if (!conversation.avatar) {
        conversation.avatar =
          getPersonAvatar(
            targetUser
          );
      }

      if (!conversation.id) {
        throw new Error(
          "The conversation was created but no conversation ID was returned."
        );
      }

      return conversation;
    } catch (requestError) {
      throw new Error(
        extractError(
          requestError,
          "Could not open a conversation with this user."
        )
      );
    }
  }


  async function handleOpenUser(
    targetUser
  ) {
    const targetUserId =
      getId(targetUser);

    if (
      !targetUserId ||
      openingUserId
    ) {
      return;
    }

    setOpeningUserId(
      targetUserId
    );

    setError("");
    setMessageError("");
    setActionMessage("");

    try {
      const conversation =
        await openConversationWithUser(
          targetUser,
          conversations
        );

      if (!conversation?.id) {
        throw new Error(
          "Could not open the conversation."
        );
      }

      setConversations(
        (current) => {
          const exists =
            current.some(
              (item) =>
                String(item.id) ===
                String(
                  conversation.id
                )
            );

          if (exists) {
            return current;
          }

          return [
            conversation,
            ...current,
          ];
        }
      );

      setSelectedConversationId(
        conversation.id
      );

      setMobileShowConversation(
        true
      );

      setSearch("");

      setShowEmojiPicker(false);
      setShowConversationMenu(false);
    } catch (requestError) {
      setError(
        extractError(
          requestError,
          "Could not open a conversation with this user."
        )
      );
    } finally {
      setOpeningUserId(null);
    }
  }


  async function openConversationWithUsername(
    username,
    loadedConversations
  ) {
    if (
      !username ||
      !currentUserId
    ) {
      return null;
    }

    const existing =
      loadedConversations.find(
        (conversation) =>
          String(
            conversation.username || ""
          ).toLowerCase() ===
          String(username).toLowerCase()
      );

    if (existing?.id) {
      return existing;
    }

    try {
      const targetUser =
        await findUserByUsername(
          username
        );

      if (!targetUser) {
        throw new Error(
          "The selected user could not be found."
        );
      }

      return await openConversationWithUser(
        targetUser,
        loadedConversations
      );
    } catch (requestError) {
      throw new Error(
        extractError(
          requestError,
          "Could not open a conversation with this user."
        )
      );
    }
  }

  const loadConversations =
    useCallback(
      async (
        selectFirst = true,
        openTarget = true
      ) => {
        setConversationLoading(true);
        setError("");

        try {
          const result =
            await requestFirstAvailable([
              "/api/chat/conversations/",
            ]);

          let items =
            asArray(
              result.data
            ).map((item) =>
              normalizeConversation(
                item,
                currentUserId
              )
            );

          if (
            openTarget &&
            targetUsername &&
            !targetOpenedRef.current
          ) {
            const targetConversation =
              await openConversationWithUsername(
                targetUsername,
                items
              );

            if (targetConversation) {
              const alreadyExists =
                items.some(
                  (item) =>
                    String(item.id) ===
                    String(
                      targetConversation.id
                    )
                );

              if (!alreadyExists) {
                items = [
                  targetConversation,
                  ...items,
                ];
              }

              setSelectedConversationId(
                targetConversation.id
              );

              setMobileShowConversation(
                true
              );

              targetOpenedRef.current =
                true;
            }
          }

          setConversations(items);

          if (
            selectFirst &&
            !targetUsername &&
            items.length > 0 &&
            !selectedConversationId
          ) {
            setSelectedConversationId(
              items[0].id
            );

            setMobileShowConversation(
              true
            );
          }
        } catch (requestError) {
          setError(
            extractError(
              requestError,
              "We could not load your conversations."
            )
          );
        } finally {
          setConversationLoading(
            false
          );
        }
      },
      [
        currentUserId,
        targetUsername,
        selectedConversationId,
      ]
    );


  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    loadConversations(
      true,
      true
    );
  }, [
    currentUserId,
    targetUsername,
  ]);


  async function markConversationRead(
    conversationId,
    showError = true
  ) {
    if (!conversationId) {
      return;
    }

    try {
      await api.get(
        `/api/chat/conversations/${conversationId}/`
      );

      setConversations(
        (current) =>
          current.map(
            (conversation) =>
              String(
                conversation.id
              ) ===
              String(conversationId)
                ? {
                    ...conversation,
                    unreadCount: 0,
                  }
                : conversation
          )
      );

      /*
       * Immediately notify UserLayout.
       */
      window.dispatchEvent(
        new CustomEvent(
          "skillhive:chat-read"
        )
      );
    } catch (requestError) {
      if (showError) {
        setMessageError(
          extractError(
            requestError,
            "Could not mark this conversation as read."
          )
        );
      }
    }
  }


  const loadMessages =
    useCallback(
      async (conversationId) => {
        if (!conversationId) {
          setMessages([]);
          return;
        }

        setMessagesLoading(true);
        setMessageError("");

        try {
          const result =
            await requestFirstAvailable([
              `/api/chat/conversations/${conversationId}/messages/`,
            ]);

          const items =
            asArray(
              result.data
            ).map((item) =>
              normalizeMessage(item)
            );

          setMessages(items);

          await markConversationRead(
            conversationId,
            false
          );
        } catch (requestError) {
          setMessageError(
            extractError(
              requestError,
              "We could not load this conversation."
            )
          );
        } finally {
          setMessagesLoading(
            false
          );
        }
      },
      []
    );



  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    loadMessages(
      selectedConversationId
    );
  }, [
    selectedConversationId,
    loadMessages,
  ]);



  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);


  useEffect(() => {
    function handleOutsideClick(
      event
    ) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(
          event.target
        )
      ) {
        setShowEmojiPicker(false);
      }
    }

    if (showEmojiPicker) {
      document.addEventListener(
        "mousedown",
        handleOutsideClick
      );
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [showEmojiPicker]);



  const selectedConversation =
    useMemo(
      () =>
        conversations.find(
          (conversation) =>
            String(
              conversation.id
            ) ===
            String(
              selectedConversationId
            )
        ) || null,
      [
        conversations,
        selectedConversationId,
      ]
    );

  const searchResults =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return {
          conversations,
          users: [],
        };
      }

      const matchingConversations =
        conversations.filter(
          (conversation) => {
            const searchable = [
              conversation.name,
              conversation.username,
              conversation.lastMessage,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return searchable.includes(
              query
            );
          }
        );

      const matchingUsers =
        skillHiveUsers.filter(
          (person) => {
            const raw =
              person.raw || {};

            const searchable = [
              person.name,
              person.username,
              raw.name,
              raw.full_name,
              raw.fullName,
              raw.display_name,
              raw.displayName,
              raw.username,
              raw.user?.name,
              raw.user?.full_name,
              raw.user?.fullName,
              raw.user?.username,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return searchable.includes(
              query
            );
          }
        );

      const usersWithoutConversation =
        matchingUsers.filter(
          (person) => {
            const hasConversation =
              conversations.some(
                (conversation) => {
                  if (
                    person.username &&
                    conversation.username
                  ) {
                    if (
                      String(
                        person.username
                      ).toLowerCase() ===
                      String(
                        conversation.username
                      ).toLowerCase()
                    ) {
                      return true;
                    }
                  }

                  return getConversationParticipants(
                    conversation.raw
                  ).some(
                    (participant) =>
                      String(
                        getId(
                          participant
                        )
                      ) ===
                      String(
                        person.id
                      )
                  );
                }
              );

            return !hasConversation;
          }
        );

      return {
        conversations:
          matchingConversations,
        users:
          usersWithoutConversation,
      };
    }, [
      conversations,
      skillHiveUsers,
      search,
    ]);


  const filteredConversations =
    searchResults.conversations;

  const searchedUsers =
    searchResults.users;


  function handleSelectConversation(
    id
  ) {
    setSelectedConversationId(id);
    setMobileShowConversation(true);
    setShowConversationMenu(false);
    setShowEmojiPicker(false);
    setActionMessage("");
    setMessageError("");
  }

  function handleEmojiClick(
    emojiData
  ) {
    const emoji =
      emojiData?.emoji || "";

    if (!emoji) {
      return;
    }

    const textarea =
      textareaRef.current;

    if (!textarea) {
      setMessageDraft(
        (current) =>
          current + emoji
      );

      return;
    }

    const start =
      textarea.selectionStart ??
      messageDraft.length;

    const end =
      textarea.selectionEnd ??
      messageDraft.length;

    const updated =
      messageDraft.slice(
        0,
        start
      ) +
      emoji +
      messageDraft.slice(end);

    setMessageDraft(updated);

    requestAnimationFrame(() => {
      textarea.focus();

      const cursor =
        start + emoji.length;

      textarea.setSelectionRange(
        cursor,
        cursor
      );
    });
  }


  function resizeTextarea(
    textarea
  ) {
    if (!textarea) {
      return;
    }

    textarea.style.height =
      "auto";

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        128
      )}px`;
  }


  async function sendMessage(event) {
    event?.preventDefault();

    const content =
      messageDraft.trim();

    if (
      !content ||
      !selectedConversationId ||
      sending
    ) {
      return;
    }

    setSending(true);
    setMessageError("");
    setActionMessage("");

    try {
      if (editingMessageId) {
        const response =
          await api.patch(
            `/api/chat/messages/${editingMessageId}/`,
            {
              content,
            }
          );

        const updated =
          normalizeMessage(
            unwrap(response)
          );

        setMessages(
          (current) =>
            current.map(
              (message) =>
                String(
                  message.id
                ) ===
                String(
                  editingMessageId
                )
                  ? {
                      ...message,
                      ...updated,
                      edited: true,
                    }
                  : message
            )
        );

        setActionMessage(
          "Message updated."
        );

        setEditingMessageId(null);
        setMessageDraft("");
      } else {
        const response =
          await api.post(
            `/api/chat/conversations/${selectedConversationId}/messages/`,
            {
              content,
            }
          );

        const newMessage =
          normalizeMessage(
            unwrap(response)
          );

        setMessages(
          (current) => [
            ...current,
            newMessage,
          ]
        );

        setConversations(
          (current) =>
            current.map(
              (conversation) =>
                String(
                  conversation.id
                ) ===
                String(
                  selectedConversationId
                )
                  ? {
                      ...conversation,
                      lastMessage:
                        content,
                      lastMessageAt:
                        newMessage.createdAt ||
                        new Date().toISOString(),
                    }
                  : conversation
            )
        );

        setMessageDraft("");
      }

      setShowEmojiPicker(false);

      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height =
            "auto";

          textareaRef.current.focus();
        }
      });
    } catch (requestError) {
      setMessageError(
        extractError(
          requestError,
          editingMessageId
            ? "Could not update the message."
            : "Could not send the message."
        )
      );
    } finally {
      setSending(false);
    }
  }


  function beginEdit(message) {
    if (
      !message ||
      message.deleted
    ) {
      return;
    }

    setEditingMessageId(
      message.id
    );

    setMessageDraft(
      message.content
    );

    setShowEmojiPicker(false);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        resizeTextarea(
          textareaRef.current
        );

        textareaRef.current.focus();

        textareaRef.current.setSelectionRange(
          message.content.length,
          message.content.length
        );
      }
    });
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setMessageDraft("");

    if (textareaRef.current) {
      textareaRef.current.style.height =
        "auto";
    }

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }


  async function deleteMessage(
    message
  ) {
    if (!message?.id) {
      return;
    }

    setMessageError("");
    setActionMessage("");

    try {
      await api.delete(
        `/api/chat/messages/${message.id}/`
      );

      setMessages(
        (current) =>
          current.filter(
            (item) =>
              String(item.id) !==
              String(message.id)
          )
      );

      setActionMessage(
        "Message deleted."
      );
    } catch (requestError) {
      setMessageError(
        extractError(
          requestError,
          "Could not delete the message."
        )
      );
    }
  }


  function handleTextareaChange(
    event
  ) {
    setMessageDraft(
      event.target.value
    );

    resizeTextarea(
      event.target
    );
  }

  function handleTextareaKeyDown(
    event
  ) {
    if (
      event.key === "Escape" &&
      showEmojiPicker
    ) {
      setShowEmojiPicker(false);
      return;
    }

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      sendMessage(event);
    }
  }


  const totalUnread =
    conversations.reduce(
      (total, conversation) =>
        total +
        Number(
          conversation.unreadCount || 0
        ),
      0
    );


  if (conversationLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="mx-auto max-w-7xl px-0 py-0 sm:px-6 sm:py-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow-sm sm:rounded-2xl sm:border sm:border-slate-200">
            <div className="grid min-h-[700px] lg:grid-cols-[350px_1fr]">
              <div className="border-r border-slate-200">
                <div className="h-20 animate-pulse bg-slate-100" />

                <div className="space-y-2 p-3">
                  {[1, 2, 3, 4, 5].map(
                    (item) => (
                      <div
                        key={item}
                        className="flex gap-3 rounded-xl p-3"
                      >
                        <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />

                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />

                          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="hidden bg-slate-50 lg:block" />
            </div>
          </div>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-0 py-0 sm:px-4 sm:py-6 lg:px-8">
        <section className="overflow-hidden bg-white shadow-sm sm:rounded-2xl sm:border sm:border-slate-200">

          <div className="grid h-[calc(100vh-100px)] min-h-[650px] lg:grid-cols-[350px_1fr]">


            <aside
              className={`flex min-h-0 flex-col border-r border-slate-200 bg-white ${
                mobileShowConversation
                  ? "hidden lg:flex"
                  : "flex"
              }`}
            >
              <div className="border-b border-slate-200 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      Chats
                    </h1>

                    {totalUnread > 0 && (
                      <p className="mt-0.5 text-xs text-blue-600">
                        {totalUnread} unread
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      loadConversations(
                        false,
                        false
                      );

                      loadSkillHiveUsers();
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Refresh chats"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                <div className="relative mt-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search people or chats"
                    className="w-full rounded-full border-0 bg-slate-100 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {search.trim() && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearch("")
                      }
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-slate-700"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {search.trim() &&
                    usersLoading && (
                      <Loader2 className="pointer-events-none absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600" />
                    )}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-2">

                {error && (
                  <div className="m-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <div className="flex items-start gap-2">
                      <X className="h-4 w-4 shrink-0" />

                      <p className="flex-1">
                        {error}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setError("");

                        loadConversations(
                          false,
                          false
                        );

                        loadSkillHiveUsers();
                      }}
                      className="mt-2 font-semibold underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {search.trim() ? (
                  <div className="space-y-4">

                    {filteredConversations.length >
                      0 && (
                      <div>
                        <div className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Chats
                        </div>

                        <div className="space-y-1">
                          {filteredConversations.map(
                            (conversation) => {
                              const active =
                                String(
                                  conversation.id
                                ) ===
                                String(
                                  selectedConversationId
                                );

                              return (
                                <button
                                  key={
                                    conversation.id ||
                                    `${conversation.name}-${conversation.username}`
                                  }
                                  type="button"
                                  onClick={() =>
                                    handleSelectConversation(
                                      conversation.id
                                    )
                                  }
                                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                                    active
                                      ? "bg-blue-50"
                                      : "hover:bg-slate-100"
                                  }`}
                                >
                                  <div className="relative">
                                    <Avatar
                                      name={
                                        conversation.name
                                      }
                                      src={
                                        conversation.avatar
                                      }
                                      size="lg"
                                    />

                                    {conversation.unreadCount >
                                      0 && (
                                      <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                                        {conversation.unreadCount >
                                        9
                                          ? "9+"
                                          : conversation.unreadCount}
                                      </span>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <h2
                                        className={`truncate text-sm ${
                                          conversation.unreadCount >
                                          0
                                            ? "font-bold text-slate-900"
                                            : "font-semibold text-slate-700"
                                        }`}
                                      >
                                        {
                                          conversation.name
                                        }
                                      </h2>

                                      <span className="shrink-0 text-[11px] text-slate-400">
                                        {formatConversationTime(
                                          conversation.lastMessageAt
                                        )}
                                      </span>
                                    </div>

                                    {conversation.username && (
                                      <p className="truncate text-xs text-slate-400">
                                        @
                                        {
                                          conversation.username
                                        }
                                      </p>
                                    )}

                                    <p
                                      className={`mt-1 truncate text-xs ${
                                        conversation.unreadCount >
                                        0
                                          ? "font-semibold text-slate-700"
                                          : "text-slate-400"
                                      }`}
                                    >
                                      {conversation.lastMessage ||
                                        "No messages yet"}
                                    </p>
                                  </div>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}

                    {searchedUsers.length >
                      0 && (
                      <div>
                        <div className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          SkillHive People
                        </div>

                        <div className="space-y-1">
                          {searchedUsers.map(
                            (person) => {
                              const personId =
                                getId(
                                  person
                                );

                              const isOpening =
                                String(
                                  openingUserId
                                ) ===
                                String(
                                  personId
                                );

                              return (
                                <button
                                  key={
                                    personId ||
                                    person.username
                                  }
                                  type="button"
                                  disabled={
                                    isOpening
                                  }
                                  onClick={() =>
                                    handleOpenUser(
                                      person
                                    )
                                  }
                                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
                                >
                                  <Avatar
                                    name={getPersonName(
                                      person
                                    )}
                                    src={getPersonAvatar(
                                      person
                                    )}
                                    size="lg"
                                  />

                                  <div className="min-w-0 flex-1">
                                    <h2 className="truncate text-sm font-semibold text-slate-900">
                                      {getPersonName(
                                        person
                                      )}
                                    </h2>

                                    {getPersonUsername(
                                      person
                                    ) && (
                                      <p className="mt-0.5 truncate text-xs text-slate-400">
                                        @
                                        {getPersonUsername(
                                          person
                                        )}
                                      </p>
                                    )}

                                    <p className="mt-1 text-xs text-blue-600">
                                      Start conversation
                                    </p>
                                  </div>

                                  {isOpening ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
                                  ) : (
                                    <MessageCircle className="h-4 w-4 shrink-0 text-slate-300" />
                                  )}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}

                    {usersLoading &&
                      searchedUsers.length ===
                        0 &&
                      filteredConversations.length ===
                        0 && (
                      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />

                        <p className="mt-3 text-sm text-slate-500">
                          Searching SkillHive users...
                        </p>
                      </div>
                    )}

                    {!usersLoading &&
                      filteredConversations.length ===
                        0 &&
                      searchedUsers.length ===
                        0 && (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Search className="h-6 w-6" />
                          </div>

                          <h2 className="mt-4 font-semibold text-slate-900">
                            No people or chats found
                          </h2>

                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            Try another name or username.
                          </p>
                        </div>
                      )}
                  </div>
                ) : (
                  <>
                    {conversations.length ===
                    0 ? (
                      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <MessageCircle className="h-7 w-7" />
                        </div>

                        <h2 className="mt-4 font-semibold text-slate-900">
                          No chats yet
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Search for a SkillHive user above to start a conversation.
                        </p>
                      </div>
                    ) : (
                      conversations.map(
                        (conversation) => {
                          const active =
                            String(
                              conversation.id
                            ) ===
                            String(
                              selectedConversationId
                            );

                          return (
                            <button
                              key={
                                conversation.id ||
                                `${conversation.name}-${conversation.username}`
                              }
                              type="button"
                              onClick={() =>
                                handleSelectConversation(
                                  conversation.id
                                )
                              }
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                                active
                                  ? "bg-blue-50"
                                  : "hover:bg-slate-100"
                              }`}
                            >
                              <div className="relative">
                                <Avatar
                                  name={
                                    conversation.name
                                  }
                                  src={
                                    conversation.avatar
                                  }
                                  size="lg"
                                />

                                {conversation.unreadCount >
                                  0 && (
                                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                                    {conversation.unreadCount >
                                    9
                                      ? "9+"
                                      : conversation.unreadCount}
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h2
                                    className={`truncate text-sm ${
                                      conversation.unreadCount >
                                      0
                                        ? "font-bold text-slate-900"
                                        : "font-semibold text-slate-700"
                                    }`}
                                  >
                                    {
                                      conversation.name
                                    }
                                  </h2>

                                  <span className="shrink-0 text-[11px] text-slate-400">
                                    {formatConversationTime(
                                      conversation.lastMessageAt
                                    )}
                                  </span>
                                </div>

                                {conversation.username && (
                                  <p className="truncate text-xs text-slate-400">
                                    @
                                    {
                                      conversation.username
                                    }
                                  </p>
                                )}

                                <p
                                  className={`mt-1 truncate text-xs ${
                                    conversation.unreadCount >
                                    0
                                      ? "font-semibold text-slate-700"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {conversation.lastMessage ||
                                    "No messages yet"}
                                </p>
                              </div>
                            </button>
                          );
                        }
                      )
                    )}
                  </>
                )}
              </div>
            </aside>

            <section
              className={`min-w-0 flex-col bg-white ${
                mobileShowConversation
                  ? "flex"
                  : "hidden lg:flex"
              }`}
            >
              {!selectedConversation ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <MessageCircle className="h-10 w-10" />
                  </div>

                  <h2 className="mt-5 text-xl font-bold text-slate-900">
                    Your messages
                  </h2>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    Search for a SkillHive user or select a conversation to start chatting.
                  </p>
                </div>
              ) : (
                <>


                  <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-4">
                    <button
                      type="button"
                      onClick={() =>
                        setMobileShowConversation(
                          false
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 lg:hidden"
                      aria-label="Back"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>

                    <Avatar
                      name={
                        selectedConversation.name
                      }
                      src={
                        selectedConversation.avatar
                      }
                      size="lg"
                    />

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                        {
                          selectedConversation.name
                        }
                      </h2>

                      {selectedConversation.username && (
                        <p className="truncate text-xs text-slate-400">
                          @
                          {
                            selectedConversation.username
                          }
                        </p>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setShowConversationMenu(
                            (current) =>
                              !current
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                        aria-label="Chat options"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                      {showConversationMenu && (
                        <div className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                          <button
                            type="button"
                            onClick={() => {
                              markConversationRead(
                                selectedConversationId
                              );

                              setShowConversationMenu(
                                false
                              );
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <CheckCheck className="h-4 w-4" />
                            Mark as read
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              loadMessages(
                                selectedConversationId
                              );

                              setShowConversationMenu(
                                false
                              );
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                          </button>
                        </div>
                      )}
                    </div>
                  </header>


                  <div className="min-h-0 flex-1 overflow-y-auto bg-white px-3 py-4 sm:px-5 sm:py-5">
                    {messageError && (
                      <div className="mx-auto mb-4 flex max-w-3xl items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                        <X className="h-4 w-4 shrink-0" />

                        <p className="flex-1">
                          {messageError}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            loadMessages(
                              selectedConversationId
                            )
                          }
                          className="font-semibold underline"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {actionMessage && (
                      <div className="mx-auto mb-4 max-w-3xl text-center text-xs text-slate-400">
                        {actionMessage}
                      </div>
                    )}

                    {messagesLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                          Loading messages...
                        </div>
                      </div>
                    ) : messages.length ===
                      0 ? (
                      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                        <Avatar
                          name={
                            selectedConversation.name
                          }
                          src={
                            selectedConversation.avatar
                          }
                          size="xl"
                        />

                        <h3 className="mt-4 font-bold text-slate-900">
                          {
                            selectedConversation.name
                          }
                        </h3>

                        {selectedConversation.username && (
                          <p className="mt-1 text-sm text-slate-400">
                            @
                            {
                              selectedConversation.username
                            }
                          </p>
                        )}

                        <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                          You are connected. Send a message to start the conversation.
                        </p>
                      </div>
                    ) : (
                      <div className="mx-auto flex max-w-4xl flex-col justify-end space-y-1">
                        {messages.map(
                          (
                            message,
                            index
                          ) => {
                            const isOwn =
                              String(
                                message.senderId
                              ) ===
                              String(
                                currentUserId
                              );

                            const previousMessage =
                              messages[
                                index - 1
                              ];

                            const previousIsOwn =
                              previousMessage &&
                              String(
                                previousMessage.senderId
                              ) ===
                              String(
                                currentUserId
                              );

                            const showAvatar =
                              !isOwn &&
                              !previousIsOwn;

                            return (
                              <div
                                key={
                                  message.id ||
                                  `${message.createdAt}-${index}`
                                }
                                className={`group flex ${
                                  isOwn
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >
                                <div
                                  className={`flex max-w-[88%] items-end gap-2 sm:max-w-[75%] ${
                                    isOwn
                                      ? "flex-row-reverse"
                                      : "flex-row"
                                  }`}
                                >
                                  {!isOwn &&
                                    (showAvatar ? (
                                      <Avatar
                                        name={
                                          message.senderName
                                        }
                                        size="sm"
                                      />
                                    ) : (
                                      <div className="w-9 shrink-0" />
                                    ))}

                                  <div className="relative min-w-0">
                                    <div
                                      className={`rounded-2xl px-3.5 py-2.5 sm:px-4 ${
                                        isOwn
                                          ? "rounded-br-md bg-blue-600 text-white"
                                          : "rounded-bl-md bg-slate-100 text-slate-900"
                                      }`}
                                    >
                                      {message.deleted ? (
                                        <p
                                          className={`text-sm italic ${
                                            isOwn
                                              ? "text-blue-100"
                                              : "text-slate-400"
                                          }`}
                                        >
                                          This message was deleted.
                                        </p>
                                      ) : (
                                        <p className="whitespace-pre-wrap break-words text-sm leading-5">
                                          {
                                            message.content
                                          }
                                        </p>
                                      )}
                                    </div>

                                    <div
                                      className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-slate-400 ${
                                        isOwn
                                          ? "justify-end"
                                          : "justify-start"
                                      }`}
                                    >
                                      <span>
                                        {formatTime(
                                          message.createdAt
                                        )}
                                      </span>

                                      {message.edited &&
                                        !message.deleted && (
                                          <span>
                                            · edited
                                          </span>
                                        )}

                                      {isOwn &&
                                        !message.deleted &&
                                        (message.isRead ? (
                                          <CheckCheck className="h-3.5 w-3.5 text-blue-600" />
                                        ) : (
                                          <Check className="h-3.5 w-3.5" />
                                        ))}
                                    </div>

                                    {isOwn &&
                                      !message.deleted && (
                                        <div className="absolute -left-20 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-md group-hover:flex">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              beginEdit(
                                                message
                                              )
                                            }
                                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                                            aria-label="Edit message"
                                          >
                                            <Edit3 className="h-3.5 w-3.5" />
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              deleteMessage(
                                                message
                                              )
                                            }
                                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                                            aria-label="Delete message"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}

                        <div
                          ref={
                            messagesEndRef
                          }
                        />
                      </div>
                    )}
                  </div>

                  <footer className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
                    <div className="mx-auto max-w-4xl">


                      {editingMessageId && (
                        <div className="mb-2 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 sm:px-4">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                              <Edit3 className="h-3.5 w-3.5" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-blue-700">
                                Editing message
                              </p>

                              <p className="hidden truncate text-[11px] text-blue-500 xs:block sm:block">
                                Make your changes and press Enter to update
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={
                              cancelEdit
                            }
                            className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-blue-500 transition hover:bg-blue-100 hover:text-blue-700"
                            aria-label="Cancel edit"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}


                      <form
                        onSubmit={
                          sendMessage
                        }
                        className="flex items-end gap-2"
                      >


                        <div className="relative min-w-0 flex-1">
                          <div
                            className={`relative flex min-h-[46px] items-end rounded-2xl border transition-all ${
                              editingMessageId
                                ? "border-blue-300 bg-blue-50/40 ring-2 ring-blue-50"
                                : "border-slate-200 bg-slate-50 focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-50"
                            }`}
                          >

                            <textarea
                              ref={
                                textareaRef
                              }
                              value={
                                messageDraft
                              }
                              onChange={
                                handleTextareaChange
                              }
                              onKeyDown={
                                handleTextareaKeyDown
                              }
                              rows={1}
                              placeholder={
                                editingMessageId
                                  ? "Edit your message..."
                                  : "Write a message..."
                              }
                              className="max-h-32 min-h-[44px] w-full resize-none overflow-y-auto bg-transparent px-4 py-3 pr-12 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400"
                            />


                            <button
                              type="button"
                              onClick={() =>
                                setShowEmojiPicker(
                                  (current) =>
                                    !current
                                )
                              }
                              className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-blue-600 hover:shadow-sm"
                              aria-label="Choose emoji"
                            >
                              <Smile className="h-5 w-5" />
                            </button>

                            <div
                              ref={
                                emojiPickerRef
                              }
                              className="absolute bottom-[calc(100%+10px)] right-0 z-50"
                            >
                              {showEmojiPicker && (
                                <div className="overflow-hidden rounded-2xl shadow-2xl">
                                  <EmojiPicker
                                    onEmojiClick={
                                      handleEmojiClick
                                    }
                                    width="min(350px, calc(100vw - 24px))"
                                    height={400}
                                    searchDisabled={
                                      false
                                    }
                                    previewConfig={{
                                      showPreview:
                                        false,
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>


                        <button
                          type="submit"
                          disabled={
                            sending ||
                            !messageDraft.trim()
                          }
                          className={`mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-all ${
                            messageDraft.trim() &&
                            !sending
                              ? "bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-95"
                              : "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
                          }`}
                          aria-label={
                            editingMessageId
                              ? "Update message"
                              : "Send message"
                          }
                        >
                          {sending ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : editingMessageId ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <Send className="h-[18px] w-[18px]" />
                          )}
                        </button>
                      </form>


                      <p className="mt-1.5 hidden text-center text-[10px] text-slate-400 sm:block">
                        Enter to send · Shift + Enter for a new line
                      </p>
                    </div>
                  </footer>
                </>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Chat;