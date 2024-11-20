// Funkcja dodająca przycisk "Ulubione" do aukcji w koszyku
function addFavouriteButtonToCartItems() {
    // Znajdujemy wszystkie kontenery przycisków usuwania
    const removeButtonContainers = document.querySelectorAll('._1bwbj._292b3_UJkFo');
    
    removeButtonContainers.forEach(container => {
        // Sprawdzamy czy przycisk ulubionych już nie istnieje
        if (!container.querySelector('.fav-button')) {
            // Pobieramy ID aukcji z przycisku usuwania
            const removeButton = container.querySelector('button');
            const auctionId = removeButton?.getAttribute('data-analytics-interaction-value');
            
            // Tworzymy przycisk ulubionych
            const favButton = document.createElement('button');
            favButton.className = 'm911_5r mdwl_5r mefy_5r mg9e_0 mh36_0 mj7a_0 mnyp_5r mqen_m6 msts_n7 mvrt_0 fav-button';
            favButton.setAttribute('type', 'button');
            favButton.setAttribute('data-auction-id', auctionId);
            
            // Ikona gwiazdki (możesz dostosować klasę ikony)
            const icon = document.createElement('i');
            icon.className = '_nem5f';
            icon.title = 'dodaj do ulubionych';
            
            favButton.appendChild(icon);
            
            // Dodajemy obsługę kliknięcia
            favButton.addEventListener('click', (e) => {
                e.preventDefault();
                const auctionId = e.currentTarget.getAttribute('data-auction-id');
                // Tu wywołamy później funkcję z FavouritesService
                console.log('Dodano do ulubionych aukcję:', auctionId);
            });
            
            // Wstawiamy przycisk przed przyciskiem usuwania
            container.insertBefore(favButton, removeButton);
        }
    });
}

// Uruchamiamy funkcję po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    addFavouriteButtonToCartItems();
});

// Obserwujemy zmiany w koszyku
const cartObserver = new MutationObserver(() => {
    addFavouriteButtonToCartItems();
});

// Znajdujemy kontener koszyka i rozpoczynamy obserwację
const cartContainer = document.querySelector('.a883q');
if (cartContainer) {
    cartObserver.observe(cartContainer, { 
        childList: true, 
        subtree: true 
    });
} 