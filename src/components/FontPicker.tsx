import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { GOOGLE_FONTS, loadAllGoogleFonts, loadGoogleFonts, cssFontFamily } from '@/lib/fonts';

/** Searchable Google-Fonts picker. Stores a bare family name ('' = default). */
export const FontPicker = ({ value, onChange }: { value?: string; onChange: (family: string) => void }) => {
  const [open, setOpen] = useState(false);
  const current = value || '';

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) loadAllGoogleFonts(); // load previews for the catalog
  };

  const select = (family: string) => {
    if (family) loadGoogleFonts([family]);
    onChange(family);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-8 text-xs font-normal"
          style={{ fontFamily: cssFontFamily(current) || undefined }}
        >
          <span className="truncate">{current || 'Default'}</span>
          <ChevronsUpDown size={12} className="opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search fonts…" className="text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs p-3 text-muted-foreground">No font found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="Default" onSelect={() => select('')} className="text-xs">
                <Check size={12} className={`mr-2 ${current === '' ? 'opacity-100' : 'opacity-0'}`} /> Default
              </CommandItem>
              {GOOGLE_FONTS.map((family) => (
                <CommandItem
                  key={family}
                  value={family}
                  onSelect={() => select(family)}
                  className="text-xs"
                  style={{ fontFamily: cssFontFamily(family) }}
                >
                  <Check size={12} className={`mr-2 shrink-0 ${current === family ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="truncate">{family}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
