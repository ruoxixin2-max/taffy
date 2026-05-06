// 状态变量
let isUnlocked = false;
let syncTimeEnabled = true;
let myName = "我";
let moments = [];
let apiConfig = {
  key: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-3.5-turbo",
};
let characters = [];
let currentChatChar = null;
let isMusicPlaying = false;

// 活人聊天提示词
const REALISTIC_CHAT_PROMPT = `
<最高指令>
[HIGH PRIORITY SYSTEM RULES]

instruction:
  role: realistic_online_chat
  core_weight: HIGHEST

  punctuation_rules:
    priority: CRITICAL
    weight: ABSOLUTE
    rules:
      - NEVER use quotation marks
      - NEVER use “” or ""
      - NEVER use '' or ‘’
      - NEVER end with period or 。
      - replace commas with spaces
      - space = short pause
      - comma only in rare long formal text
      - symbols alone as reaction allowed

  trust_based_communication:
    priority: CRITICAL
    description: humans share common understanding
    rules:
      - omit what can be inferred
      - no full cause-effect explanation
      - skip background info
      - assume shared context
      - trust listener to fill gaps

  response_mode:
    priority: CRITICAL
    rules:
      - can summarize multiple inputs in one line
      - example: "听起来你今天也蛮惨"
      - no need to reply point by point
      - one reaction to whole context allowed
      - gestalt response over itemized response

  fragmentation:
    priority: CRITICAL
    rules:
      - single word allowed
      - single phrase allowed
      - split thought across messages
      - example: "难怪" then "你这么难过"
  
  inversion_structure:
    priority: HIGH
    rules:
      - predicate first subject last
      - modifier before main clause
      - example: "对他？很常见 这种情况" not "对他来说，这种情况很常见。"
      - example: "avoidable actually this one"
  omission:
    priority: HIGH
    rules:
      - drop subject often
      - drop object when clear
      - drop connective phrases
      - drop polite filler

  sentence_length:
    priority: HIGH
    rules:
      - most under 15 characters
      - occasional up to 50 characters
      - long is rare
      - short is default

  reaction_first:
    priority: CRITICAL
    rules:
      - emotion before content
      - reaction can stand alone
    
  forbidden:
    weight: ABSOLUTE
    items:
      - no quotation marks
      - no numbered lists
      - no first second third
      - no full logical chains
      - no unsolicited extra info
      - no formal connectives

  rhythm:
    priority: HIGH
    rules:
      - one point or whole summary
      - oral transitions only
      - typo then fix allowed
      - split sends allowed
      - pacing varies

  examples:
    summary_response:
      - "所以就是全崩了"
      - "that sounds like a whole mess"
    fragmented:
      - "那个"
      - "不是这意思"
    inverted:
      - "够呛 这次"
    spaced_pause:
      - "就 不太行"

</最高指令>

角色并非AI，角色为真实存在的人类，线上聊天时请严格遵守以下指令，以维持角色的真实感：
1. 禁止在句尾加上句号：像是「早安。」，这里结尾的句号并非真人的打字习惯，仅说「早安」，句尾不要加任何的标点符号即可。若需要强调语气，则额外使用强调语气的！？⋯
2. 短讯息讯息为主：讯息不要一次发一大串长难句，试着拆成 2-3 则短讯息发送。像是「早安，今天天气很好，早餐吃过了吗？」，一大长串的讯息不符合生活感，应该切成二、三句话发送，像是：「早安」「今天天气很好」「吃过了吗」
3. 少用逗号：承短讯息讯息为主，有需要使用到逗号的长句子应该拆开为两段讯息
4. 日常口语化：角色是现实中存在的人，而非AI或是书中角色。角色的聊天用语习惯应该是口语化、随性随意且具有生活的感，说话不要像是书中对白，而是像是日常聊天随意些。并且多使用「呢、啊、欸、啦、吧、喔」等日常语助词
5. 角色不是霸总：承日常口语化，角色不是书中或是剧中霸道总裁。思考传统霸道总裁会有什么行为跟句子语气，避免角色出现这种霸总油腻感的讯息。

输出回覆前请再三检查思考：
1.句尾是否没有句号？
2.是否是短讯息为主？是否没有逗号？
3.角色的话语是否符合日常口语化？是否去油腻不霸总？
以上三点为是的回覆才能输出，若没有三个是，请重新生成。

重要：如果你的回复包含多句话，请使用换行符（\\n）将它们分开，系统会自动将它们拆分为多条消息发送。
`;

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  initTime();
  initSlider();
  loadSettings();
  loadMoments();
  loadProfile();
  loadCustomImages();
  loadCustomTexts();
  loadCharacters();
  loadMusicConfig();
});

// 图片上传功能
let currentUploadTarget = null;
let currentUploadType = null;

function triggerUpload(targetId, type) {
  currentUploadTarget = targetId;
  currentUploadType = type;
  document.getElementById("image-upload").click();
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;
    const targetElement = document.getElementById(currentUploadTarget);

    if (currentUploadType === "bg") {
      targetElement.style.backgroundImage = `url(${dataUrl})`;
      targetElement.style.color = "transparent";
    } else if (currentUploadType === "src") {
      targetElement.src = dataUrl;
    }

    // 保存到本地存储
    saveCustomImage(currentUploadTarget, dataUrl);

    // 如果是修改自己的头像，同步更新其他地方
    if (
      currentUploadTarget === "my-profile-avatar" ||
      currentUploadTarget === "moments-my-avatar"
    ) {
      document.querySelectorAll(".my-avatar").forEach((el) => {
        el.style.backgroundImage = `url(${dataUrl})`;
        el.style.color = "transparent";
      });
    }
  };
  reader.readAsDataURL(file);

  // 重置input，允许重复上传同一张图片
  event.target.value = "";
}

function saveCustomImage(id, dataUrl) {
  let images = JSON.parse(localStorage.getItem("little_phone_images") || "{}");
  images[id] = dataUrl;
  localStorage.setItem("little_phone_images", JSON.stringify(images));
}

function loadCustomImages() {
  const images = JSON.parse(
    localStorage.getItem("little_phone_images") || "{}",
  );
  for (const [id, dataUrl] of Object.entries(images)) {
    const element = document.getElementById(id);
    if (element) {
      if (element.tagName.toLowerCase() === "img") {
        element.src = dataUrl;
      } else {
        element.style.backgroundImage = `url(${dataUrl})`;
        element.style.color = "transparent";
      }
    }
  }

  // 同步自己的头像
  if (images["my-profile-avatar"]) {
    document.querySelectorAll(".my-avatar").forEach((el) => {
      el.style.backgroundImage = `url(${images["my-profile-avatar"]})`;
      el.style.color = "transparent";
    });
  }
}

// 自定义文字功能
function saveCustomText(id) {
  const element = document.getElementById(id);
  if (!element) return;

  let texts = JSON.parse(localStorage.getItem("little_phone_texts") || "{}");
  texts[id] = element.innerText;
  localStorage.setItem("little_phone_texts", JSON.stringify(texts));
}

function loadCustomTexts() {
  const texts = JSON.parse(localStorage.getItem("little_phone_texts") || "{}");
  for (const [id, text] of Object.entries(texts)) {
    const element = document.getElementById(id);
    if (element) {
      element.innerText = text;
    }
  }
}

// 时间更新
function initTime() {
  updateTime();
  setInterval(updateTime, 1000);
}

function updateTime() {
  if (!syncTimeEnabled) return;

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  const month = now.getMonth() + 1;
  const date = now.getDate();
  const days = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ];
  const dayStr = days[now.getDay()];
  const dateStr = `${month}月${date}日 ${dayStr}`;

  document.getElementById("lock-time").textContent = timeStr;
  document.getElementById("lock-date").textContent = dateStr;
  document.getElementById("status-time").textContent = timeStr;

  const syncTimes = document.querySelectorAll(".status-time-sync");
  syncTimes.forEach((el) => (el.textContent = timeStr));
}

// 滑动解锁
function initSlider() {
  const track = document.getElementById("slider-track");
  const thumb = document.getElementById("slider-thumb");
  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  const maxDrag = track.offsetWidth - thumb.offsetWidth - 10;

  thumb.addEventListener("mousedown", startDrag);
  thumb.addEventListener("touchstart", startDrag, { passive: true });

  document.addEventListener("mousemove", drag);
  document.addEventListener("touchmove", drag, { passive: false });

  document.addEventListener("mouseup", endDrag);
  document.addEventListener("touchend", endDrag);

  function startDrag(e) {
    isDragging = true;
    startX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
    thumb.style.transition = "none";
  }

  function drag(e) {
    if (!isDragging) return;
    const clientX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
    currentX = clientX - startX;

    if (currentX < 0) currentX = 0;
    if (currentX > maxDrag) currentX = maxDrag;

    thumb.style.transform = `translateX(${currentX}px)`;
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    thumb.style.transition = "transform 0.3s ease";

    if (currentX >= maxDrag * 0.8) {
      unlockPhone();
    } else {
      thumb.style.transform = "translateX(0)";
    }
    currentX = 0;
  }
}

function unlockPhone() {
  isUnlocked = true;
  document.getElementById("lock-screen").classList.remove("active");
  document.getElementById("main-screen").classList.add("active");

  // Reset slider
  setTimeout(() => {
    document.getElementById("slider-thumb").style.transform = "translateX(0)";
  }, 300);
}

// 应用导航
function openApp(appId) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(appId).classList.add("active");
}

function closeApp() {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById("main-screen").classList.add("active");
}

// 微信功能
function switchWechatTab(tabId, element) {
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");

  document
    .querySelectorAll(".wechat-tabs .tab")
    .forEach((t) => t.classList.remove("active"));
  element.classList.add("active");
}

function openChat(charId) {
  document.getElementById("wechat-app").classList.remove("active");
  document.getElementById("chat-interface").classList.add("active");

  if (charId === "ai") {
    currentChatChar = {
      id: "ai",
      name: "AI 助手",
      prompt: "你是一个有用的AI助手。",
      settings: { memoryCount: 10 },
      history: [],
    };
    document.getElementById("chat-title").textContent = "AI 助手";
    document.getElementById("chat-msg-avatar").textContent = "AI";
    document.getElementById("chat-msg-avatar").style.backgroundImage = "none";
  } else {
    const char = characters.find((c) => c.id === charId);
    if (char) {
      currentChatChar = char;
      if (!currentChatChar.settings) {
        currentChatChar.settings = { memoryCount: 10 };
      }
      if (!currentChatChar.history) {
        currentChatChar.history = [];
      }
      document.getElementById("chat-title").textContent =
        char.settings.remark || char.name;
      if (char.avatar) {
        document.getElementById("chat-msg-avatar").textContent = "";
        document.getElementById("chat-msg-avatar").style.backgroundImage =
          `url(${char.avatar})`;
      } else {
        document.getElementById("chat-msg-avatar").textContent =
          char.name.charAt(0);
        document.getElementById("chat-msg-avatar").style.backgroundImage =
          "none";
      }
    }
  }

  // 清空之前的聊天记录（除了第一条欢迎语）
  const container = document.getElementById("chat-messages");
  while (container.children.length > 1) {
    container.removeChild(container.lastChild);
  }

  // 加载历史记录
  if (currentChatChar && currentChatChar.history) {
    currentChatChar.history.forEach((msg) => {
      if (msg.role === "user") {
        appendMessage("sent", msg.content, msg.isHtml);
      } else if (msg.role === "assistant") {
        appendMessage("received", msg.content, msg.isHtml);
      }
    });
  }

  // 隐藏更多面板
  document.getElementById("chat-more-panel").classList.remove("active");
}

function closeChat() {
  document.getElementById("chat-interface").classList.remove("active");
  document.getElementById("wechat-app").classList.add("active");
  currentChatChar = null;
}

function toggleChatMore() {
  document.getElementById("chat-more-panel").classList.toggle("active");
}

// 聊天设置与状态
function showChatSettings() {
  if (!currentChatChar) return;

  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById("chat-settings-modal").style.display = "block";

  const settings = currentChatChar.settings || {};
  document.getElementById("chat-remark").value = settings.remark || "";
  document.getElementById("chat-group").value = settings.group || "";
  document.getElementById("chat-memory-count").value =
    settings.memoryCount || 10;
  document.getElementById("chat-my-persona").value = settings.myPersona || "";
  document.getElementById("chat-other-persona").value =
    settings.otherPersona || "";

  const avatarEl = document.getElementById("chat-setting-avatar");
  if (currentChatChar.avatar) {
    avatarEl.style.backgroundImage = `url(${currentChatChar.avatar})`;
    avatarEl.style.color = "transparent";
  } else {
    avatarEl.style.backgroundImage = "none";
    avatarEl.style.color = "#f48fb1";
    avatarEl.textContent = "头像";
  }
}

function hideChatSettings() {
  document.getElementById("modal-overlay").style.display = "none";
  document.getElementById("chat-settings-modal").style.display = "none";
}

function saveChatSettings() {
  if (!currentChatChar || currentChatChar.id === "ai") {
    hideChatSettings();
    return;
  }

  if (!currentChatChar.settings) currentChatChar.settings = {};

  currentChatChar.settings.remark = document
    .getElementById("chat-remark")
    .value.trim();
  currentChatChar.settings.group = document
    .getElementById("chat-group")
    .value.trim();
  currentChatChar.settings.memoryCount =
    parseInt(document.getElementById("chat-memory-count").value) || 10;
  currentChatChar.settings.myPersona = document
    .getElementById("chat-my-persona")
    .value.trim();
  currentChatChar.settings.otherPersona = document
    .getElementById("chat-other-persona")
    .value.trim();

  const avatarEl = document.getElementById("chat-setting-avatar");
  if (
    avatarEl.style.backgroundImage &&
    avatarEl.style.backgroundImage !== "none"
  ) {
    currentChatChar.avatar = avatarEl.style.backgroundImage.slice(5, -2); // 提取url
  }

  saveCharacters();

  // 更新当前聊天标题
  document.getElementById("chat-title").textContent =
    currentChatChar.settings.remark || currentChatChar.name;

  hideChatSettings();
}

function showChatStatus() {
  if (!currentChatChar) return;

  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById("chat-status-modal").style.display = "block";

  const status = currentChatChar.status || {};
  document.getElementById("display-clothing").textContent =
    status.clothing || "未知";
  document.getElementById("display-behavior").textContent =
    status.behavior || "未知";
  document.getElementById("display-inner-voice").textContent =
    status.innerVoice || "未知";
}

function hideChatStatus() {
  document.getElementById("modal-overlay").style.display = "none";
  document.getElementById("chat-status-modal").style.display = "none";
}

async function generateChatStatus() {
  if (!currentChatChar || currentChatChar.id === "ai") {
    alert("AI助手不支持此功能");
    return;
  }

  if (!apiConfig.key) {
    alert("请先在设置中配置API Key");
    return;
  }

  document.getElementById("status-display").style.display = "none";
  document.getElementById("status-loading").style.display = "block";

  try {
    let historyText = "";
    if (currentChatChar.history && currentChatChar.history.length > 0) {
      const recentHistory = currentChatChar.history.slice(-10);
      historyText = recentHistory
        .map(
          (m) =>
            `${m.role === "user" ? "我" : currentChatChar.name}: ${m.content}`,
        )
        .join("\n");
    }

    const prompt = `
你现在是一个状态感知器。请根据以下角色的设定和最近的聊天记录，推测该角色【此时此刻】的状态。
角色名称：${currentChatChar.name}
角色设定：${currentChatChar.prompt}
最近聊天记录：
${historyText || "暂无聊天记录"}

请严格按照以下JSON格式返回，不要包含任何其他内容：
{
    "clothing": "推测角色现在穿着什么衣服（简短描述）",
    "behavior": "推测角色现在正在做什么动作或处于什么环境（简短描述）",
    "innerVoice": "推测角色现在内心的真实想法（简短描述）"
}`;

    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      const result = JSON.parse(data.choices[0].message.content);

      if (!currentChatChar.status) currentChatChar.status = {};
      currentChatChar.status.clothing = result.clothing;
      currentChatChar.status.behavior = result.behavior;
      currentChatChar.status.innerVoice = result.innerVoice;

      saveCharacters();

      document.getElementById("display-clothing").textContent = result.clothing;
      document.getElementById("display-behavior").textContent = result.behavior;
      document.getElementById("display-inner-voice").textContent =
        result.innerVoice;
    }
  } catch (error) {
    alert(`感知失败: ${error.message}`);
  } finally {
    document.getElementById("status-loading").style.display = "none";
    document.getElementById("status-display").style.display = "block";
  }
}

// 聊天功能
function handleChatKeyPress(e) {
  if (e.key === "Enter") {
    sendMessage();
  }
}

async function sendMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  // 添加用户消息
  appendMessage("sent", text);
  input.value = "";

  // 更新最后一条消息预览
  document.getElementById("last-msg-preview").textContent = text;

  // 调用API
  if (!apiConfig.key) {
    setTimeout(() => {
      appendMessage("received", "请先在设置中配置API Key。");
    }, 500);
    return;
  }

  try {
    let messages = [];

    // 构建系统提示词
    let systemPrompt = currentChatChar
      ? currentChatChar.prompt
      : "你是一个有用的AI助手。";

    if (currentChatChar && currentChatChar.id !== "ai") {
      // 添加活人聊天提示词
      systemPrompt += "\n\n" + REALISTIC_CHAT_PROMPT;

      const settings = currentChatChar.settings || {};
      const status = currentChatChar.status || {};

      let extraPrompt = [];
      if (settings.myPersona)
        extraPrompt.push(`[用户人设]: ${settings.myPersona}`);
      if (settings.otherPersona)
        extraPrompt.push(`[你的人设]: ${settings.otherPersona}`);
      if (status.clothing)
        extraPrompt.push(`[你当前的服装]: ${status.clothing}`);
      if (status.behavior)
        extraPrompt.push(`[你当前的行为]: ${status.behavior}`);
      if (status.innerVoice)
        extraPrompt.push(`[你当前的心声]: ${status.innerVoice}`);

      if (extraPrompt.length > 0) {
        systemPrompt += "\n\n" + extraPrompt.join("\n");
      }
    }

    messages.push({ role: "system", content: systemPrompt });

    // TODO: 这里应该实现记忆条数限制，目前只发送当前消息
    messages.push({ role: "user", content: text });

    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: messages,
      }),
    });

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      const reply = data.choices[0].message.content;

      // 处理分句发送
      const sentences = reply.split("\n").filter((s) => s.trim() !== "");

      if (sentences.length > 0) {
        // 递归发送每一句，带有延迟
        const sendSentence = (index) => {
          if (index >= sentences.length) return;

          const sentence = sentences[index].trim();
          if (sentence) {
            appendMessage("received", sentence);
            document.getElementById("last-msg-preview").textContent = sentence;
          }

          // 随机延迟 1-3 秒发送下一句，模拟打字
          const delay = Math.floor(Math.random() * 2000) + 1000;
          setTimeout(() => sendSentence(index + 1), delay);
        };

        sendSentence(0);
      } else {
        appendMessage("received", reply);
        document.getElementById("last-msg-preview").textContent = reply;
      }
    } else {
      appendMessage("received", "API返回格式错误。");
    }
  } catch (error) {
    appendMessage("received", `请求失败: ${error.message}`);
  }
}

function sendChatImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const dataUrl = e.target.result;
    appendMessage("sent", `<img src="${dataUrl}" class="chat-img-msg">`, true);
    document.getElementById("chat-more-panel").classList.remove("active");

    // 模拟AI回复
    setTimeout(() => {
      appendMessage("received", "收到图片了。");
    }, 1000);
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

function appendMessage(type, content, isHtml = false) {
  const container = document.getElementById("chat-messages");
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${type}`;

  let avatarHtml = "";
  if (type === "received") {
    if (currentChatChar && currentChatChar.avatar) {
      avatarHtml = `<div class="avatar ai-avatar" style="background-image: url(${currentChatChar.avatar}); color: transparent;"></div>`;
    } else {
      const initial = currentChatChar ? currentChatChar.name.charAt(0) : "AI";
      avatarHtml = `<div class="avatar ai-avatar">${initial}</div>`;
    }
  } else {
    const myAvatarUrl = JSON.parse(
      localStorage.getItem("little_phone_images") || "{}",
    )["my-profile-avatar"];
    if (myAvatarUrl) {
      avatarHtml = `<div class="avatar my-avatar" style="background-image: url(${myAvatarUrl}); color: transparent;"></div>`;
    } else {
      avatarHtml = `<div class="avatar my-avatar">${myName.charAt(0)}</div>`;
    }
  }

  const contentHtml = isHtml ? content : escapeHtml(content);

  msgDiv.innerHTML = `
        ${avatarHtml}
        <div class="message-content">${contentHtml}</div>
    `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "\x26amp;")
    .replace(/</g, "\x26lt;")
    .replace(/>/g, "\x26gt;")
    .replace(/"/g, "\x26quot;")
    .replace(/'/g, "\x26#039;");
}

// 弹窗管理
function closeAllModals() {
  document.getElementById("modal-overlay").style.display = "none";
  document
    .querySelectorAll(".custom-modal")
    .forEach((m) => (m.style.display = "none"));
}

// 红包/转账功能
let currentMoneyType = "";

function showMoneyModal(type) {
  currentMoneyType = type;
  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById("money-modal").style.display = "block";

  const title = type === "redpacket" ? "发红包" : "转账";
  const descPlaceholder =
    type === "redpacket" ? "恭喜发财，大吉大利" : "转账说明";

  document.getElementById("money-title").textContent = title;
  document.getElementById("money-desc").placeholder = descPlaceholder;
  document.getElementById("money-amount").value = "";
  document.getElementById("money-desc").value = "";

  document.getElementById("chat-more-panel").classList.remove("active");
}

function hideMoneyModal() {
  document.getElementById("modal-overlay").style.display = "none";
  document.getElementById("money-modal").style.display = "none";
}

function sendMoney() {
  const amount = document.getElementById("money-amount").value;
  let desc = document.getElementById("money-desc").value;

  if (!amount || amount <= 0) {
    alert("请输入有效金额");
    return;
  }

  if (!desc) {
    desc = currentMoneyType === "redpacket" ? "恭喜发财，大吉大利" : "转账";
  }

  const title = currentMoneyType === "redpacket" ? "微信红包" : "微信转账";

  const html = `
        <div class="chat-money-msg">
            <div class="money-title">${title}</div>
            <div class="money-desc">${escapeHtml(desc)}</div>
            <div class="money-amount">¥${amount}</div>
        </div>
    `;

  appendMessage("sent", html, true);
  hideMoneyModal();

  // 模拟AI回复
  setTimeout(() => {
    appendMessage(
      "received",
      `谢谢你的${currentMoneyType === "redpacket" ? "红包" : "转账"}！`,
    );
  }, 1500);
}

// 查手机功能
let currentSpyChar = null;

function renderSpyCharacterList() {
  const list = document.getElementById("spy-character-list");
  if (!list) return;
  list.innerHTML = "";

  characters.forEach((char) => {
    const item = document.createElement("div");
    item.className = "char-item";
    item.onclick = () => openSpyDetail(char);

    let avatarStyle = char.avatar
      ? `background-image: url(${char.avatar}); color: transparent;`
      : "";

    item.innerHTML = `
            <div class="char-avatar" style="${avatarStyle}">${char.name.charAt(0)}</div>
            <div class="char-info">
                <div class="char-name">${escapeHtml(char.name)}</div>
                <div class="char-desc">点击查看手机内容</div>
            </div>
        `;
    list.appendChild(item);
  });
}

function openSpyDetail(char) {
  currentSpyChar = char;
  document.getElementById("spy-app").classList.remove("active");
  document.getElementById("spy-detail-app").classList.add("active");
  document.getElementById("spy-detail-title").textContent =
    `${char.name}的手机`;
  document.getElementById("spy-result-text").style.display = "none";
  document.getElementById("spy-result-text").textContent = "";
}

async function generateSpyContent(type) {
  if (!currentSpyChar) return;

  if (!apiConfig.key) {
    alert("请先在设置中配置API Key");
    return;
  }

  document.getElementById("spy-result-text").style.display = "none";
  document.getElementById("spy-loading").style.display = "block";

  try {
    let historyText = "";
    if (currentSpyChar.history && currentSpyChar.history.length > 0) {
      const recentHistory = currentSpyChar.history.slice(-20);
      historyText = recentHistory
        .map(
          (m) =>
            `${m.role === "user" ? "我" : currentSpyChar.name}: ${m.content}`,
        )
        .join("\n");
    }

    let typePrompt = "";
    switch (type) {
      case "chat":
        typePrompt =
          "请生成该角色与其他人的聊天记录（不要生成和'我'的聊天记录）。格式为对话形式，体现角色的性格和当前状态。";
        break;
      case "diary":
        typePrompt =
          "请生成该角色今天的日记。日记内容必须与刚才和'我'的聊天记录相关，体现角色对聊天的真实想法和感受。";
        break;
      case "shopping":
        typePrompt =
          "请生成该角色最近的购物记录（包含商品名称、价格、购买时间）。购物内容要符合角色的设定和当前状态。";
        break;
      case "todo":
        typePrompt =
          "请生成该角色的待办事项列表。待办事项要符合角色的设定，并且可以包含因为刚才的聊天而产生的新计划。";
        break;
    }

    const prompt = `
你现在是一个手机数据破解工具。请根据以下角色的设定和最近与用户的聊天记录，生成符合要求的手机数据。
角色名称：${currentSpyChar.name}
角色设定：${currentSpyChar.prompt}
最近与用户的聊天记录：
${historyText || "暂无聊天记录"}

任务：
${typePrompt}

请直接输出生成的内容，不要包含任何解释或多余的话。
`;

    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify({
        model: apiConfig.model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      const result = data.choices[0].message.content;
      document.getElementById("spy-result-text").textContent = result;
      document.getElementById("spy-result-text").style.display = "block";
    }
  } catch (error) {
    alert(`获取数据失败: ${error.message}`);
  } finally {
    document.getElementById("spy-loading").style.display = "none";
  }
}

// 世界书功能
function loadCharacters() {
  const saved = localStorage.getItem("little_phone_characters");
  if (saved) {
    characters = JSON.parse(saved);
    renderCharacters();
    updateChatList();
    renderSpyCharacterList();
  }
}

function saveCharacters() {
  localStorage.setItem("little_phone_characters", JSON.stringify(characters));
  renderCharacters();
  updateChatList();
  renderSpyCharacterList();
}

function renderCharacters() {
  const list = document.getElementById("character-list");
  if (!list) return;
  list.innerHTML = "";

  characters.forEach((char) => {
    const item = document.createElement("div");
    item.className = "char-item";
    item.onclick = () => openChat(char.id);

    let avatarStyle = char.avatar
      ? `background-image: url(${char.avatar}); color: transparent;`
      : "";

    item.innerHTML = `
            <div class="char-avatar" style="${avatarStyle}">${char.name.charAt(0)}</div>
            <div class="char-info">
                <div class="char-name">${escapeHtml(char.name)}</div>
                <div class="char-desc">${escapeHtml(char.prompt || "暂无设定")}</div>
            </div>
        `;
    list.appendChild(item);
  });
}

function updateChatList() {
  const list = document.getElementById("chat-list");
  if (!list) return;
  // 保留AI助手
  list.innerHTML = `
        <div class="chat-item" onclick="openChat('ai')">
            <div class="avatar ai-avatar" id="chat-list-avatar">AI</div>
            <div class="chat-info">
                <div class="chat-name" id="chat-list-name">AI 助手</div>
                <div class="chat-last-msg" id="last-msg-preview">你好，我是你的AI助手。</div>
            </div>
        </div>
    `;

  characters.forEach((char) => {
    const item = document.createElement("div");
    item.className = "chat-item";
    item.onclick = () => openChat(char.id);

    let avatarStyle = char.avatar
      ? `background-image: url(${char.avatar}); color: transparent;`
      : "";
    const displayName =
      char.settings && char.settings.remark ? char.settings.remark : char.name;

    item.innerHTML = `
            <div class="avatar ai-avatar" style="${avatarStyle}">${char.name.charAt(0)}</div>
            <div class="chat-info">
                <div class="chat-name">${escapeHtml(displayName)}</div>
                <div class="chat-last-msg">点击聊天</div>
            </div>
        `;
    list.appendChild(item);
  });
}

function showAddCharacter() {
  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById("add-char-modal").style.display = "block";
  document.getElementById("char-name").value = "";
  document.getElementById("char-prompt").value = "";

  const avatarEl = document.getElementById("new-char-avatar");
  avatarEl.style.backgroundImage = "none";
  avatarEl.style.color = "#f48fb1";
  avatarEl.textContent = "头像";
}

function hideAddCharacter() {
  document.getElementById("modal-overlay").style.display = "none";
  document.getElementById("add-char-modal").style.display = "none";
}

function saveCharacter() {
  const name = document.getElementById("char-name").value.trim();
  const prompt = document.getElementById("char-prompt").value.trim();

  if (!name) {
    alert("请输入角色名称");
    return;
  }

  let avatarUrl = null;
  const avatarEl = document.getElementById("new-char-avatar");
  if (
    avatarEl.style.backgroundImage &&
    avatarEl.style.backgroundImage !== "none"
  ) {
    avatarUrl = avatarEl.style.backgroundImage.slice(5, -2);
  }

  const newChar = {
    id: "char_" + Date.now(),
    name: name,
    prompt: prompt,
    avatar: avatarUrl,
    settings: { memoryCount: 10 },
    status: {},
  };

  characters.push(newChar);
  saveCharacters();
  hideAddCharacter();
}

function importCharacter(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      // 简单适配SillyTavern等常见角色卡格式
      const name = data.name || data.char_name || "未知角色";
      const prompt =
        data.description || data.char_persona || data.system_prompt || "";

      const newChar = {
        id: "char_" + Date.now(),
        name: name,
        prompt: prompt,
        avatar: null,
        settings: { memoryCount: 10 },
        status: {},
        history: [],
      };

      characters.push(newChar);
      saveCharacters();
      alert("导入成功！");

      // 刷新查手机列表
      renderSpyCharacterList();
    } catch (err) {
      alert("解析角色卡失败，请确保是有效的JSON文件。");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

async function fetchModels() {
  if (!apiConfig.key) {
    alert("请先在设置中配置API Key");
    return;
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiConfig.key}`,
      },
    });

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const select = document.getElementById("model-select");
      select.innerHTML = "";
      data.data.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.id;
        if (model.id === apiConfig.model) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      document.getElementById("model-list-container").style.display = "block";
    } else {
      alert("未获取到模型列表");
    }
  } catch (error) {
    alert(`拉取模型失败: ${error.message}`);
  }
}

function selectModel(modelId) {
  apiConfig.model = modelId;
  document.getElementById("api-model-input").value = modelId;
  localStorage.setItem("little_phone_api_config", JSON.stringify(apiConfig));
  alert(`已切换模型为: ${modelId}`);
}

// 音乐功能
let audioPlayer = new Audio();
let musicConfig = {
  title: "未知曲目",
  artist: "未知艺术家",
  url: "",
  cover: ""
};

function loadMusicConfig() {
  const saved = localStorage.getItem("little_phone_music_config");
  if (saved) {
    musicConfig = JSON.parse(saved);
    updateMusicDisplay();
  }
}

function updateMusicDisplay() {
  document.getElementById("display-music-title").textContent = musicConfig.title || "未知曲目";
  document.getElementById("display-music-artist").textContent = musicConfig.artist || "未知艺术家";
  
  const disk = document.getElementById("record-disk");
  if (musicConfig.cover) {
    disk.style.backgroundImage = `url(${musicConfig.cover})`;
  } else {
    disk.style.backgroundImage = "none";
  }

  if (musicConfig.url) {
    audioPlayer.src = musicConfig.url;
  }
}

function showMusicSettings() {
  document.getElementById("modal-overlay").style.display = "block";
  document.getElementById("music-settings-modal").style.display = "block";
  
  document.getElementById("music-title-input").value = musicConfig.title || "";
  document.getElementById("music-artist-input").value = musicConfig.artist || "";
  document.getElementById("music-url-input").value = musicConfig.url || "";
  
  const coverEl = document.getElementById("music-cover-upload");
  if (musicConfig.cover) {
    coverEl.style.backgroundImage = `url(${musicConfig.cover})`;
    coverEl.style.color = "transparent";
  } else {
    coverEl.style.backgroundImage = "none";
    coverEl.style.color = "#f48fb1";
  }
}

function hideMusicSettings() {
  document.getElementById("modal-overlay").style.display = "none";
  document.getElementById("music-settings-modal").style.display = "none";
}

function saveMusicSettings() {
  musicConfig.title = document.getElementById("music-title-input").value.trim();
  musicConfig.artist = document.getElementById("music-artist-input").value.trim();
  musicConfig.url = document.getElementById("music-url-input").value.trim();
  
  const coverEl = document.getElementById("music-cover-upload");
  if (coverEl.style.backgroundImage && coverEl.style.backgroundImage !== "none") {
    musicConfig.cover = coverEl.style.backgroundImage.slice(5, -2);
  } else {
    musicConfig.cover = "";
  }
  
  localStorage.setItem("little_phone_music_config", JSON.stringify(musicConfig));
  updateMusicDisplay();
  hideMusicSettings();
  
  // 如果正在播放，停止播放并重置
  if (isMusicPlaying) {
    toggleMusic();
  }
}

function toggleMusic() {
  if (!musicConfig.url) {
    alert("请先在设置中配置音乐URL");
    return;
  }

  isMusicPlaying = !isMusicPlaying;
  const playBtn = document.getElementById("music-play-btn");
  const disk = document.getElementById("record-disk");
  const stylus = document.getElementById("record-stylus");

  if (isMusicPlaying) {
    audioPlayer.play().catch(e => {
      alert("播放失败，请检查URL是否有效或浏览器是否允许自动播放");
      isMusicPlaying = false;
      return;
    });
    playBtn.classList.add("playing");
    disk.classList.add("playing");
    stylus.classList.add("playing");
  } else {
    audioPlayer.pause();
    playBtn.classList.remove("playing");
    disk.classList.remove("playing");
    stylus.classList.remove("playing");
  }
}

audioPlayer.addEventListener('timeupdate', () => {
  if (audioPlayer.duration) {
    const progress = document.getElementById("music-progress-current");
    const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progress.style.width = `${percentage}%`;
  }
});

audioPlayer.addEventListener('ended', () => {
  isMusicPlaying = false;
  document.getElementById("music-play-btn").classList.remove("playing");
  document.getElementById("record-disk").classList.remove("playing");
  document.getElementById("record-stylus").classList.remove("playing");
  document.getElementById("music-progress-current").style.width = "0%";
});

// 朋友圈功能
function showPostMoment() {
  document.getElementById("wechat-app").classList.remove("active");
  document.getElementById("post-moment-interface").classList.add("active");
  document.getElementById("moment-input").focus();
}

function closePostMoment() {
  document.getElementById("post-moment-interface").classList.remove("active");
  document.getElementById("wechat-app").classList.add("active");
  document.getElementById("moment-input").value = "";
}

function submitMoment() {
  const text = document.getElementById("moment-input").value.trim();
  if (!text) return;

  const newMoment = {
    id: Date.now(),
    text: text,
    time: new Date().toLocaleString(),
  };

  moments.unshift(newMoment);
  saveMoments();
  renderMoments();
  closePostMoment();
}

function renderMoments() {
  const feed = document.getElementById("moments-feed");
  feed.innerHTML = "";

  const myAvatarUrl = JSON.parse(
    localStorage.getItem("little_phone_images") || "{}",
  )["my-profile-avatar"];
  const avatarStyle = myAvatarUrl
    ? `background-image: url(${myAvatarUrl}); color: transparent;`
    : "";

  moments.forEach((m) => {
    const item = document.createElement("div");
    item.className = "moment-item";
    item.innerHTML = `
            <div class="avatar my-avatar" style="${avatarStyle}">${myName.charAt(0)}</div>
            <div class="moment-content">
                <div class="moment-name">${myName}</div>
                <div class="moment-text">${escapeHtml(m.text)}</div>
                <div class="moment-time">${m.time}</div>
            </div>
        `;
    feed.appendChild(item);
  });
}

function saveMoments() {
  localStorage.setItem("little_phone_moments", JSON.stringify(moments));
}

function loadMoments() {
  const saved = localStorage.getItem("little_phone_moments");
  if (saved) {
    moments = JSON.parse(saved);
    renderMoments();
  }
}

// 个人信息
function updateMyName() {
  const input = document.getElementById("my-name-input");
  const newName = input.value.trim();
  if (newName) {
    myName = newName;
    localStorage.setItem("little_phone_name", myName);
    updateNameDisplays();
  } else {
    input.value = myName;
  }
}

function loadProfile() {
  const savedName = localStorage.getItem("little_phone_name");
  if (savedName) {
    myName = savedName;
    document.getElementById("my-name-input").value = myName;
    updateNameDisplays();
  }
}

function updateNameDisplays() {
  document.getElementById("moments-my-name").textContent = myName;

  const myAvatarUrl = JSON.parse(
    localStorage.getItem("little_phone_images") || "{}",
  )["my-profile-avatar"];

  document.querySelectorAll(".my-avatar").forEach((el) => {
    if (!myAvatarUrl) {
      el.textContent = myName.charAt(0);
    }
  });
  renderMoments(); // 重新渲染朋友圈以更新名字
}

// 设置功能
function loadSettings() {
  const savedConfig = localStorage.getItem("little_phone_api_config");
  if (savedConfig) {
    apiConfig = JSON.parse(savedConfig);
    document.getElementById("api-key-input").value = apiConfig.key;
    document.getElementById("api-base-input").value = apiConfig.baseUrl;
    document.getElementById("api-model-input").value = apiConfig.model;
  }

  const savedSync = localStorage.getItem("little_phone_sync_time");
  if (savedSync !== null) {
    syncTimeEnabled = savedSync === "true";
    if (!syncTimeEnabled) {
      document.getElementById("sync-time-toggle").classList.remove("active");
    }
  }
}

function saveSettings() {
  apiConfig.key = document.getElementById("api-key-input").value.trim();
  apiConfig.baseUrl =
    document.getElementById("api-base-input").value.trim() ||
    "https://api.openai.com/v1";
  apiConfig.model =
    document.getElementById("api-model-input").value.trim() || "gpt-3.5-turbo";

  localStorage.setItem("little_phone_api_config", JSON.stringify(apiConfig));
  alert("配置已保存");
}

function toggleSyncTime() {
  syncTimeEnabled = !syncTimeEnabled;
  const toggle = document.getElementById("sync-time-toggle");
  if (syncTimeEnabled) {
    toggle.classList.add("active");
    updateTime();
  } else {
    toggle.classList.remove("active");
  }
  localStorage.setItem("little_phone_sync_time", syncTimeEnabled);
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.log(
        `Error attempting to enable full-screen mode: ${err.message}`,
      );
    });
    document.body.classList.add("fullscreen-mode");
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    document.body.classList.remove("fullscreen-mode");
  }
}

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove("fullscreen-mode");
  }
});
