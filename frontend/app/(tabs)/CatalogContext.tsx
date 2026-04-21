import { createContext, ReactNode, useContext, useState } from 'react';

export type CatalogItem = {
  Id:         string;
  Name:       string;
  ScanCount:  number;
  LastScan:   string;
  PriceRange: string;
  Starred:    boolean;
};

type CatalogContextType = {
  Items:      CatalogItem[];
  AddItems:   (names: string[]) => void;
  DeleteItem: (Id: string) => void;
  ToggleStar: (Id: string) => void;
};

const CatalogContext = createContext<CatalogContextType | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [Items, SetItems] = useState<CatalogItem[]>([
    {
      Id: '1',
      Name: 'Milk',
      ScanCount: 2,
      LastScan: 'Just now',
      PriceRange: '$3.99–$4.49',
      Starred: true,
    },
    {
      Id: '2',
      Name: 'Eggs',
      ScanCount: 1,
      LastScan: 'Just now',
      PriceRange: '$2.99–$3.49',
      Starred: false,
    },
    {
      Id: '3',
      Name: 'Bananas',
      ScanCount: 1,
      LastScan: 'Just now',
      PriceRange: '$1.50–$2.00',
      Starred: false,
    },
  ]);

  function AddItems(names: string[]) {
    SetItems(Prev => {
      const Updated = [...Prev];
      const Now     = 'Just now';
      names.forEach(Raw => {
        const Parts    = Raw.split(' — ');
        const Name     = Parts[0]?.trim() ?? Raw;
        const Price    = Parts[1]?.trim() ?? '';
        const Existing = Updated.find(I => I.Name.toLowerCase() === Name.toLowerCase());
        if (Existing) {
          Existing.ScanCount += 1;
          Existing.LastScan   = Now;
          if (Existing.ScanCount >= 3) Existing.Starred = true;
        } else {
          Updated.push({
            Id:         Date.now().toString() + Math.random().toString(36).slice(2),
            Name,
            ScanCount:  1,
            LastScan:   Now,
            PriceRange: Price ? `${Price}–${Price}` : 'Price unknown',
            Starred:    false,
          });
        }
      });
      return Updated;
    });
  }

  function DeleteItem(Id: string) {
    SetItems(Prev => Prev.filter(I => I.Id !== Id));
  }

  function ToggleStar(Id: string) {
    SetItems(Prev => Prev.map(I => I.Id === Id ? { ...I, Starred: !I.Starred } : I));
  }

  return (
    <CatalogContext.Provider value={{ Items, AddItems, DeleteItem, ToggleStar }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const Ctx = useContext(CatalogContext);
  if (!Ctx) throw new Error('useCatalog must be used inside CatalogProvider');
  return Ctx;
}
export default function CatalogContextRoute() { return null; }
