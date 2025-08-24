"use strict";
// Funkcja do znajdowania URL napisów auto-generowanych
function findCaptionUrl() {
    var _a, _b;
    // @ts-ignore
    const playerResponse = window.ytInitialPlayerResponse;
    if (!((_b = (_a = playerResponse === null || playerResponse === void 0 ? void 0 : playerResponse.captions) === null || _a === void 0 ? void 0 : _a.playerCaptionsTracklistRenderer) === null || _b === void 0 ? void 0 : _b.captionTracks))
        return null;
    const tracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
    const autoTrack = tracks.find((t) => { var _a, _b; return t.kind === 'asr' || ((_b = (_a = t.name) === null || _a === void 0 ? void 0 : _a.simpleText) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes('auto')); });
    return autoTrack ? autoTrack.baseUrl : null;
}
// Funkcja do pobierania napisów
function downloadAutoSub() {
    const captionUrl = findCaptionUrl();
    if (!captionUrl) {
        alert("Nie znaleziono automatycznych napisów!");
        return;
    }
    const vttUrl = captionUrl + '&fmt=vtt';
    const a = document.createElement('a');
    a.href = vttUrl;
    a.download = 'napisy.vtt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
// Funkcja do wstawiania sidebaru
function injectSidebar() {
    var _a, _b, _c;
    if (document.getElementById('zentala-sidebar'))
        return;
    const sidebar = document.createElement('div');
    sidebar.id = 'zentala-sidebar';
    sidebar.style.position = 'fixed';
    sidebar.style.top = '60px';
    sidebar.style.right = '0';
    sidebar.style.width = '320px';
    sidebar.style.height = 'calc(100vh - 60px)';
    sidebar.style.background = '#fff';
    sidebar.style.boxShadow = '0 0 16px rgba(0,0,0,0.13)';
    sidebar.style.zIndex = '9999';
    sidebar.style.borderLeft = '1px solid #eee';
    sidebar.style.display = 'flex';
    sidebar.style.flexDirection = 'column';
    sidebar.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid #eee;">
      <strong>zentala-yt</strong>
      <button id="zentala-close-btn" style="float:right">×</button>
    </div>
    <div style="padding: 16px; flex:1;">
      <button id="download-subs-btn" style="width:100%; margin-bottom:12px;">Pobierz automatyczne napisy</button>
      <textarea id="zentala-prompt" style="width:100%; height:120px;" placeholder="Wpisz prompt lub wklej napisy"></textarea>
      <button id="send-to-gpt" style="margin-top:12px; width:100%;">Wyślij do ChatGPT</button>
    </div>
  `;
    document.body.appendChild(sidebar);
    (_a = document.getElementById('zentala-close-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
        sidebar.remove();
    });
    (_b = document.getElementById('download-subs-btn')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        downloadAutoSub();
    });
    (_c = document.getElementById('send-to-gpt')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', () => {
        const promptElement = document.getElementById('zentala-prompt');
        const prompt = promptElement.value.trim();
        if (!prompt) {
            alert('Wpisz prompt!');
            return;
        }
        localStorage.setItem('zentala-gpt-prompt', prompt);
        window.open("https://chat.openai.com/?zentala=1", "_blank");
    });
}
// Automatyczne wstawienie sidebaru na YT
injectSidebar();
