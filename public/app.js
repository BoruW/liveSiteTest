const $ = (id) => document.getElementById(id);
const feed = $('feed');
const EMOTICONS = [':)', 'XD', 'o_o', '(͡° ͜ʖ ͡°)', '(๑ˇεˇ๑)', 'ʕ •ᴥ•ʔ', ":'(", 'D:'];
let socket;
let joined = false;

function setStatus(online, text) {
  $('status-dot').className = `dot ${online ? 'online' : 'offline'}`;
  $('status-text').textContent = text;
}

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${location.host}`);
  socket.addEventListener('open', () => { setStatus(true, 'Connected'); joinRoom(); });
  socket.addEventListener('close', () => { setStatus(false, 'Reconnecting…'); joined = false; setTimeout(connect, 1500); });
  socket.addEventListener('error', () => setStatus(false, 'Connection error'));
  socket.addEventListener('message', ({ data }) => handle(JSON.parse(data)));
}

function send(message) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }
function joinRoom() { send({ type:'join', name:$('name').value, room:$('room').value }); }

function handle(message) {
  if (message.type === 'connected' || message.type === 'joined') {
    joined = true; $('room-label').textContent = `Room / ${message.room}`; $('count').textContent = message.count ?? 1; return;
  }
  if (message.type === 'presence') { $('count').textContent = message.count; return; }
  if (message.type === 'message') addMessage(message.sender, message.text, message.sentAt);
  if (message.type === 'data') addMessage(message.sender, message.payload, message.sentAt, true);
}

function addMessage(sender, content, sentAt, isData = false) {
  feed.querySelector('.empty-state')?.remove();
  const item = document.createElement('article'); item.className = `message${isData ? ' data-message' : ''}`;
  const time = new Date(sentAt).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
  const top = document.createElement('div'); top.className = 'message-top'; top.innerHTML = `<span>${escapeHtml(sender)}${isData ? ' · JSON' : ''}</span><time>${time}</time>`;
  item.append(top);
  if (isData) { const pre = document.createElement('pre'); pre.textContent = JSON.stringify(content, null, 2); item.append(pre); }
  else { const p = document.createElement('p'); p.textContent = content; item.append(p); }
  feed.append(item); feed.scrollTop = feed.scrollHeight;
}
function escapeHtml(text) { return text.replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

$('join').addEventListener('click', joinRoom);
$('emoticon-options').addEventListener('click', (event) => {
  const button = event.target.closest('[data-emoticon]');
  if (!button) return;
  $('message').value = button.dataset.emoticon;
  document.querySelectorAll('.emoticon-option').forEach((option) => option.classList.toggle('selected', option === button));
  $('message').focus();
});
$('message-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('message');
  if (!EMOTICONS.includes(input.value)) return;
  send({ type:'message', text:input.value });
  input.value = '';
  document.querySelectorAll('.emoticon-option').forEach((option) => option.classList.remove('selected'));
});
$('send-json').addEventListener('click', () => { const result = $('json-result'); try { const payload = JSON.parse($('json-input').value); send({ type:'data', payload }); result.className = 'validation good'; result.textContent = 'Sent to the room.'; } catch { result.className = 'validation bad'; result.textContent = 'That JSON is not valid yet.'; } });
$('name').addEventListener('change', joinRoom); $('room').addEventListener('change', joinRoom);
connect();
