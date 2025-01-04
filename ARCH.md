architectural vision of bookmark manager

- we want to keep extended datablase of bookmarks with some additional data user notes, auto LLMgnenerated excperts or tags etc.
- we want to track changes in bookmars in our db and chrome (we already have it in code) and create llm embedding for new bookmarks, and add those additional autognerated data to our db
- at the satage of indexing bookmarks we want to add some additioanl functionalities, because for now we are doing llm embbedins only to what comes from chrome, but i would like to scrap linked page, make summarty with llm, adjust tags with llm, and then add all of this to our db
- mysle ze na poczatku jak skanumeuy zakadi i wogle to user bedzie musial zatiwrdzac pewne zmiany sugferowane albo bedzie dostawal propzocyje, np wyobraz sobie ze scraupujemy storne ktora miala niejasy opis w chomr w zakladach, a mu wchodzac na nia jestesmy w stanie wygnerowac jasniejszy! co wiecej widzac w jakim kontekscie ta storna wyspruje (np zakupy czy inspiracje) mozemy dodawac do jej title czy desciroption dodatkowe informacje, nawet wg oczekiwan usera, np user w folderze moze ustawic format bookmasts i one beda automatycznie mofyfikowane aby pasowac do tego formu tuitke np [xxxx USD][xx GB RAM][xx.xx TB HDD]
- chce tez aby takie ai moglo zebrac dosc informacji o zakladach ale tez o mojej strukturze zaklade aby zapropnowac poprawki w obu
- np ustala ze mna jakie jest znacznie filderow, np w folderze "to watch" dopisujemy do notatek ze user chce aby storowac tutaj filmy i seriale , aby meic w przyszlosci jak bedzie szukal ppmyslo na fil miejsce z nimi
- np mam folder z filmami do oberzenia i aby mi zapropnowalo kazdy title aby wyraznie byl w jakims formacie np [2024][movie][sci-fi][USA] or [2000-2005][series][drama][UK] - format jest zdefifmniownay w katalogu
- albo ze znalazlo gdzies filmy w innych foldera i pyta czy je przeniesc, czy skopiwoac czy zostawaac tam gdzie sa
- ogolene to chce aby dla kazdego z plikow i folderow byly jakies rekomendacje poprawk ktore moge zaakcpeotac albo kazac je robic wg innje logiki, albo izgonowac, 
- moge tez na poczatku skupic sie na okreslownych foldera, a pozniej z czasem analizowac z nimi kolejne. 
- wiec mysle ze jest potrzeban jakas warstawa abstakcji dla listy sugestii z ai do wprowadzenia do danyego folderu, ktre czekja na akualizacje usera, mozliwe tez ze trzeba by przecowwyac wszystkie zmiany, zarowno automatyczne, jak i proponowane, zaakcepowane, cala historie zmian aby ew moc poruszac ie w historii zmian... albo wiedziec co gdzie bylo, moc latwiej znalexcx... nie wiem.
- mysele ze potrzeba jakiegos miesca gdzie bedziemy przechowwac te sugerstie, to bedzie w bazie danych, zastanwaim sie jaki model


co jest najwazniejsz w tej aplikacji:
- precyzyjne szukanie zakladek po slowach kluczowych i znaczeniach 
- ladne infograficzne takie mindmap wizualizowanie drzewa zakladek
moze na https://jsmind.online/#sample aby moc zamykac w drzewie to co nas nie obchodzi i pracoac z tym co nas obchodzi
- wsopolpraca mocna miedzy czatbotem a 
