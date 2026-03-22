import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Link, Columns } from 'lucide-react';
import { toast } from 'sonner';

export const SpreadsheetPanel = () => {
  const { projects, activeProjectId, activeSheetId, setRows, addRow, updateRow, removeRow } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const sheet = project?.sheets.find((s) => s.id === activeSheetId);
  const template = sheet?.template;
  const rows = sheet?.rows ?? [];
  const [sheetUrl, setSheetUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [newColName, setNewColName] = useState('');

  if (!template || !activeProjectId) return null;

  const tagColumns: string[] = template.elements
    .map((el) => {
      const match = el.tag.match(/^\{\{(.+)\}\}$/);
      return match ? match[1].trim() : null;
    })
    .filter((c): c is string => c !== null);

  const dataColumns: string[] = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r)))
  ).filter((c) => !tagColumns.includes(c));

  const columns = [...tagColumns, ...dataColumns];

  const handleImportSheet = async () => {
    if (!sheetUrl.trim()) return;
    setImporting(true);
    try {
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

      const headers = lines[0];
      const imported: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = lines[i][idx] ?? '';
        });
        imported.push(row);
      }

      setRows(activeProjectId, imported);
      toast.success(`Imported ${imported.length} rows with ${headers.length} columns`);
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

  const handleAddColumn = () => {
    const name = newColName.trim();
    if (!name) return;
    if (columns.includes(name)) {
      toast.error('Column already exists');
      return;
    }
    const updated = rows.map((r) => ({ ...r, [name]: '' }));
    setRows(activeProjectId, updated.length > 0 ? updated : [{ [name]: '' }]);
    setNewColName('');
    toast.success(`Added column "${name}"`);
  };

  const handleRemoveColumn = (col: string) => {
    const updated = rows.map((r) => {
      const copy = { ...r };
      delete copy[col];
      return copy;
    });
    setRows(activeProjectId, updated);
    toast.success(`Removed column "${col}"`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
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
        <div className="border-l border-border h-6" />
        <div className="flex gap-1 items-end">
          <Input
            placeholder="New column name"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
            className="text-xs h-8 w-36"
          />
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleAddColumn}>
            <Columns size={12} /> Column
          </Button>
        </div>
        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handleAddRow}>
          <Plus size={12} /> Row
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {columns.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-muted-foreground text-sm text-center">
              Add columns above or create template elements with <code className="text-primary">{'{{tag}}'}</code> names.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-xs">#</TableHead>
                {columns.map((col) => (
                  <TableHead key={col} className="text-xs font-display">
                    <div className="flex items-center gap-1">
                      <span className={tagColumns.includes(col) ? 'text-primary' : ''}>{col}</span>
                      {!tagColumns.includes(col) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 hover:text-destructive"
                          onClick={() => handleRemoveColumn(col)}
                        >
                          <Trash2 size={8} />
                        </Button>
                      )}
                    </div>
                  </TableHead>
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
        )}
      </div>
    </div>
  );
};
