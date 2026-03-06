export interface Hairstyle {
  id: string;
  name: string;
  category: string;
  gender: "female" | "male" | "unisex";
  imageUrl: string;
  description: string;
}

export interface HairColor {
  id: string;
  name: string;
  hex: string;
}

export const hairstyles: Hairstyle[] = [
  {
    id: "f-long-1",
    name: "Straight Long",
    category: "Long",
    gender: "female",
    imageUrl: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=400&q=80",
    description: "Classic straight long hair for a sleek look."
  },
  {
    id: "f-long-2",
    name: "Wavy Long",
    category: "Long",
    gender: "female",
    imageUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=400&q=80",
    description: "Elegant waves for added volume and style."
  },
  {
    id: "f-short-1",
    name: "Bob Cut",
    category: "Short",
    gender: "female",
    imageUrl: "https://images.unsplash.com/photo-1584297141812-0199b7d33f2e?auto=format&fit=crop&w=400&q=80",
    description: "A trendy bob cut that frames the face perfectly."
  },
  {
    id: "f-short-2",
    name: "Pixie Cut",
    category: "Short",
    gender: "female",
    imageUrl: "https://images.unsplash.com/photo-1592188072370-65821f691780?auto=format&fit=crop&w=400&q=80",
    description: "Bold and stylish short pixie cut."
  },
  {
    id: "f-trendy-1",
    name: "Wolf Cut",
    category: "Trendy",
    gender: "female",
    imageUrl: "https://images.unsplash.com/photo-1620331311520-246422fd82f9?auto=format&fit=crop&w=400&q=80",
    description: "Modern layered cut with a rebellious edge."
  },
  {
    id: "m-classic-1",
    name: "Side Part",
    category: "Classic",
    gender: "male",
    imageUrl: "https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?auto=format&fit=crop&w=400&q=80",
    description: "Timeless side part for a professional look."
  },
  {
    id: "m-modern-1",
    name: "Fade Cut",
    category: "Modern",
    gender: "male",
    imageUrl: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=400&q=80",
    description: "Sharp fade cut for a clean, modern appearance."
  },
  {
    id: "m-modern-2",
    name: "Undercut",
    category: "Modern",
    gender: "male",
    imageUrl: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=400&q=80",
    description: "Stylish undercut with longer hair on top."
  },
  {
    id: "m-trendy-1",
    name: "Korean Cut",
    category: "Trendy",
    gender: "male",
    imageUrl: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=400&q=80",
    description: "Popular K-pop inspired hairstyle."
  }
];

export const hairColors: HairColor[] = [
  { id: "c-1", name: "Natural", hex: "transparent" },
  { id: "c-2", name: "Black", hex: "#000000" },
  { id: "c-3", name: "Dark Brown", hex: "#4a2c2a" },
  { id: "c-4", name: "Light Brown", hex: "#8b5a2b" },
  { id: "c-5", name: "Blonde", hex: "#d4af37" },
  { id: "c-6", name: "Ash Grey", hex: "#b2beb5" },
  { id: "c-7", name: "Red", hex: "#8b0000" },
  { id: "c-8", name: "Blue", hex: "#00008b" },
  { id: "c-9", name: "Silver", hex: "#c0c0c0" }
];

export const getCategoriesByGender = (gender: "female" | "male"): string[] => {
  const categories = hairstyles
    .filter(h => h.gender === gender || h.gender === "unisex")
    .map(h => h.category);
  return ["All", ...Array.from(new Set(categories))];
};
