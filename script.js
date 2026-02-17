document.addEventListener("DOMContentLoaded", () => {
  console.log("%c>>> TIL-TALK CHATBOT (GPT-4O-MINI) ACTIVE <<<", "color: #9b6b9e; font-size: 14px; font-weight: bold;");
  console.log("Chatbot script loaded");

  const chatBody = document.querySelector(".chat-body");
  const messageInput = document.querySelector(".message-input");
  const sendMessageButton = document.querySelector("#send-message");
  const fileInput = document.querySelector("#file-input");
  const fileUploadWrapper = document.querySelector("#file-upload-wrapper");
  const fileCancelButton = document.querySelector("#file-cancel");
  const chatbotToggler = document.querySelector("#chatbot-toggler");
  const closeChatbot = document.querySelector("#close-chatbot");

  if (!chatbotToggler) {
    console.error("Chatbot toggler not found!");
    return;
  }

  // API setup
  const API_KEY = "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";
  const API_URL = "https://api.openai.com/v1/chat/completions";



  const userData = {
    message: null,
    file: {
      data: null,
      mime_type: null,
    },
  };

  const chatHistory = [];
  const initialInputHeight = messageInput.scrollHeight;

  // Create message element with dynamic classes and return it
  const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
  };

  // Generate bot response using API
  const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");

    // Add user message to chat history in OpenAI format
    const userContent = [{ type: "text", text: userData.message }];
    if (userData.file.data) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${userData.file.mime_type};base64,${userData.file.data}` },
      });
    }

    chatHistory.push({
      role: "user",
      content: userContent,
    });

    // API request options
    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: chatHistory,
      }),
    };

    try {
      // Fetch bot response from API
      const response = await fetch(API_URL, requestOptions);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error.message);

      // Extract and display the bot response
      const apiResponseText = data.choices[0].message.content.trim();
      messageElement.innerText = apiResponseText;

      // Add bot response to chat history
      chatHistory.push({
        role: "assistant",
        content: apiResponseText,
      });
    } catch (error) {
      console.log(error);

      // Try to list available models to help debug
      messageElement.innerHTML = `<span style="color: #ff0000">Error: ${error.message}</span><br><br><strong>Tip:</strong> Check your OpenAI API Key or Quota.`;
      messageElement.style.color = "#ff0000";
    } finally {
      incomingMessageDiv.classList.remove("thinking");
      chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    }
  };

  // Handle outgoing user messages
  const handleOutgoingMessage = (e) => {
    e.preventDefault();
    userData.message = messageInput.value.trim();
    messageInput.value = "";
    messageInput.dispatchEvent(new Event("input"));

    // Create and display user message
    const messageContent = `<div class="message-text"></div>
                            ${userData.file.data
        ? `<img src=data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />`
        : ""
      }`;
    const outgoingMessageDiv = createMessageElement(
      messageContent,
      "user-message"
    );
    outgoingMessageDiv.querySelector(".message-text").textContent =
      userData.message;
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Simulate bot response with thinking indicator after a dely
    setTimeout(() => {
      const messageContent = `<img src="logo.svg" class="bot-avatar" alt="Bot Avatar" />
            <div class="message-text">
              <div class="thinking-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
              </div>
            </div>`;
      const incomingMessageDiv = createMessageElement(
        messageContent,
        "bot-message",
        "thinking"
      );
      chatBody.appendChild(incomingMessageDiv);
      chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
      generateBotResponse(incomingMessageDiv);
    }, 600);
  };

  // Handle Enter key press for sending messages
  messageInput.addEventListener("keydown", (e) => {
    const userMessage = e.target.value.trim();
    if (e.key === "Enter" && userMessage && !e.shiftKey && window.innerWidth > 768) {
      handleOutgoingMessage(e);
    }
  });


  // Auto resize message input
  messageInput.addEventListener("input", (e) => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
  });

  // Handle file input change
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result.split(",")[1];

      // Store file data in userData
      userData.file = {
        data: base64String,
        mime_type: file.type,
      };

      fileInput.value = "";
    };

    reader.readAsDataURL(file);
  });

  // Emoji picker setup
  try {
    if (typeof EmojiMart !== 'undefined') {
      const picker = new EmojiMart.Picker({
        theme: "light",
        skinTonePosition: "none",
        preview: "none",
        onEmojiSelect: (emoji) => {
          const { selectionStart: start, selectionEnd: end } = messageInput;
          messageInput.setRangeText(emoji.native, start, end, "end");
          messageInput.focus();
        },
        onClickOutside: (e) => {
          if (e.target.id === "emoji-picker") {
            document.body.classList.toggle("show-emoji-picker");
          } else {
            document.body.classList.remove("show-emoji-picker");
          }
        }
      });
      document.querySelector(".chat-form").appendChild(picker);
    } else {
      console.warn("EmojiMart not loaded. Verify CDN connection.");
      const emojiPickerBtn = document.querySelector("#emoji-picker");
      if (emojiPickerBtn) emojiPickerBtn.style.display = 'none';
    }
  } catch (error) {
    console.error("Failed to initialize EmojiMart:", error);
  }

  sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
  document
    .querySelector("#file-upload")
    .addEventListener("click", () => fileInput.click());

  chatbotToggler.addEventListener("click", () => {
    console.log("Chatbot toggler clicked");
    document.body.classList.toggle("show-chatbot");
  });

  closeChatbot.addEventListener("click", () => {
    document.body.classList.remove("show-chatbot");
  });
});
