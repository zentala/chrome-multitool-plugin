// Funkcja do znajdowania URL napisów auto-generowanych (ulepszona i asynchroniczna)
async function findCaptionUrl(): Promise<string | null> {
  try {
    // @ts-ignore
    let playerResponse = window.ytInitialPlayerResponse;

    // Sprawdzenie, czy playerResponse jest dostępny i zawiera dane napisów
    if (!playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
      console.log('Zentala-YT: ytInitialPlayerResponse not found on window, fetching page source...');
      const videoId = new URLSearchParams(window.location.search).get('v');
      if (!videoId) {
        console.error('Zentala-YT: Could not get video ID from URL.');
        return null;
      }
      // Jeśli nie ma, pobierz HTML strony i wyciągnij z niego playerResponse
      const pageSource = await fetch(`https://www.youtube.com/watch?v=${videoId}`).then(res => res.text());
      const playerResponseMatch = pageSource.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/);

      if (playerResponseMatch && playerResponseMatch[1]) {
        playerResponse = JSON.parse(playerResponseMatch[1]);
      } else {
        console.error('Zentala-YT: Could not find ytInitialPlayerResponse in page source.');
        return null;
      }
    }

    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks) {
      console.error('Zentala-YT: Caption tracks not found in playerResponse.');
      return null;
    }

    const autoTrack = tracks.find((t: any) => t.kind === 'asr' || t.name?.simpleText?.toLowerCase().includes('auto'));
    return autoTrack ? autoTrack.baseUrl : null;

  } catch (error) {
    console.error('Zentala-YT: An error occurred while finding the caption URL:', error);
    return null;
  }
}

// Funkcja do pobierania napisów (zaktualizowana do pracy z asynchronicznością)
async function downloadAutoSub() {
  const captionUrl = await findCaptionUrl();
  if (!captionUrl) {
    alert("Nie znaleziono automatycznych napisów lub wystąpił błąd!");
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
  if (document.getElementById('zentala-sidebar')) return;

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

  document.getElementById('zentala-close-btn')?.addEventListener('click', () => {
    sidebar.remove();
  });

  document.getElementById('download-subs-btn')?.addEventListener('click', () => {
    downloadAutoSub();
  });

  document.getElementById('send-to-gpt')?.addEventListener('click', () => {
    const promptElement = document.getElementById('zentala-prompt') as HTMLTextAreaElement;
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