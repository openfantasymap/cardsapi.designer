import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Download, Link } from 'lucide-react';
import { toast } from 'sonner';

export const SpreadsheetPanel = () => {
  const { projects, activeProjectId, setRows, addRow, updateRow, removeRow } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const template = project?.template;
  const rows = project?.rows ?? [];
  const [sheetUrl, setSheetUrl] = useState('');
  const [importing, setImporting] = useState(false);

  if (!template || !activeProjectId) return null;

  // Extract tag names from template elements (strip {{ }})
  const columns = template.elements
    .map((el) => {
      const match = el.tag.match(/^\{\{(.+)\}\}$/);
      return match ? match[1].trim() : null;
    })
    .filter(Boolean) as string[];

  if (columns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm text-center">
          Add template elements with <code className="text-primary">{'{{tag}}'}</code> names first, then come here to fill in data.
        </p>
      </div>
    );
  }

  const handleImportSheet = async () => {
    if (!sheetUrl.trim()) return;
    setImporting(true);
    try {
      // Extract sheet ID from various Google Sheets URL formats
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        toast.error('Invalid Google Sheets URL');
        return;
      }
      const sheetId = match[1];
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error('Could not fetch sheet. Make sure it is published to the web.');
      const text = await res.text();
      const lines = text.split('\n').map((l) => l.split(',').map((c) => c.replace(/^"|"$/g, '').trim()));
      if (lines.length < 2) {
        toast.error('Sheet is empty');
        return;
      }

      const headers = lines[0].map((h) => h.toLowerCase());
      const imported: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row: Record<string, string> = {};
        columns.forEach((col) => {
          const idx = headers.indexOf(col.toLowerCase());
          row[col] = idx >= 0 && lines[i][idx] ? lines[i][idx] : '';
        });
        imported.push(row);
      }

      setRows(activeProjectId, imported);
      toast.success(`Imported ${imported.length} rows`);
      setSheetUrl('');
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleAddRow = () => {
    const empty: Record<string, string> = {};
    columns.forEach((c) => (empty[c] = ''));
    addRow(activeProjectId, empty);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Google Sheets import */}
      <div className="p-3 border-b border-border flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">Google Sheets URL (published)</Label>
          <Input
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            className="text-xs h-8"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleImportSheet} disabled={importing}>
          <Link size={12} /> {importing ? 'Importing…' : 'Import'}
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleAddRow}>
          <Plus size={12} /> Row
        </Button>
      </div>

      {/* Editable table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-xs">#</TableHead>
              {columns.map((col) => (
                <TableHead key={col} className="text-xs font-display">{col}</TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                {columns.map((col) => (
                  <TableCell key={col} className="p-1">
                    <Input
                      value={row[col] ?? ''}
                      onChange={(e) => updateRow(activeProjectId, i, { ...row, [col]: e.target.value })}
                      className="text-xs h-7 border-0 bg-transparent focus-visible:ring-1"
                    />
                  </TableCell>
                ))}
                <TableCell className="p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:text-destructive"
                    onClick={() => removeRow(activeProjectId, i)}
                  >
                    <Trash2 size={10} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 2} className="text-center text-xs text-muted-foreground py-8">
                  No data yet. Add a row or import from Google Sheets.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
