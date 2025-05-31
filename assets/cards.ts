interface Card {
    id: string;
    name: string;
    logo: string;
    type: 'barcode' | 'qrcode';
    color: string;
}

export const POPULAR_CARDS: Card[] = [
    { 
        "id": "kaufland",
        "name": "Kaufland",
        "logo": "kaufland.png",
        "type": "barcode",
        "color": "red"
    }
]
