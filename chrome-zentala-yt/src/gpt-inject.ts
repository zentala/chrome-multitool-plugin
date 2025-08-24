window.addEventListener('load', () => {
  const prompt = localStorage.getItem('zentala-gpt-prompt');
  if (prompt) {
    const tryInject = () => {
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
      if (textarea) {
        textarea.value = prompt;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        localStorage.removeItem('zentala-gpt-prompt');
        // Opcjonalnie: Automatyczne wysłanie (odkomentuj jeśli chcesz)
        // setTimeout(() => {
        //   const submitBtn = textarea.form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        //   submitBtn?.click();
        // }, 500);
        return true;
      }
      return false;
    };

    let tries = 0;
    const interval = setInterval(() => {
      if (tryInject() || ++tries > 10) clearInterval(interval);
    }, 500);
  }
}); 