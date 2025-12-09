import React, { useState, useEffect } from 'react';
import { 
  Search, Trash2, Eye, MoreHorizontal, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw, Database, PanelLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DatabaseClass, DatabaseObject } from '@/types';

interface DataBrowserProps {
  classes: DatabaseClass[];
  selectedClass: string;
  objects: DatabaseObject[];
  loading: boolean;
  pagination: any;
  searchQuery: string;
  isSearching: boolean;
  selectedObjects: Set<string>;
  dbType: string;
  onClassSelect: (className: string) => void;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onPageChange: (page: number) => void;
  onRefreshClasses: () => void;
  onDeleteClass: (className: string) => void;
  onViewObject: (obj: DatabaseObject) => void;
  onEditObject: (obj: DatabaseObject) => void;
  onDeleteObject: (id: string) => void;
  onBulkDelete: () => void;
  onToggleSelection: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
}

export function DataBrowser({
  classes, selectedClass, objects, loading, pagination, searchQuery, isSearching,
  selectedObjects, dbType, onClassSelect, onSearchChange, onSearch, onClearSearch,
  onPageChange, onRefreshClasses, onDeleteClass, onViewObject,
  onBulkDelete, onToggleSelection, onSelectAll
}: DataBrowserProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pageInput, setPageInput] = useState(pagination.currentPage.toString());

  useEffect(() => {
    setPageInput(pagination.currentPage.toString());
  }, [pagination.currentPage]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= pagination.totalPages) {
      onPageChange(page);
    } else {
      setPageInput(pagination.currentPage.toString());
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
    }
  };

  const formatObjectProperties = (properties: Record<string, unknown>) => {
    if (!properties) return 'No properties';
    const formatted = Object.entries(properties)
      .map(([key, value]) => {
        if (typeof value === 'string' && value.length > 100) {
          return `${key}: "${value.substring(0, 300)}..."`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join('\n');
    return formatted || 'Empty object';
  };

  const highlightSearchText = (text: string, searchTerm: string): React.JSX.Element => {
    if (!searchTerm || !text) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return (
      <span>
        {parts.map((part, index) => 
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">{part}</mark>
          ) : <span key={index}>{part}</span>
        )}
      </span>
    );
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)]">
      {/* Classes Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'} transition-all duration-300 ease-in-out overflow-hidden`}>
        <Card className="h-full w-80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{dbType === 'weaviate' ? 'Classes' : 'Collections'}</CardTitle>
              <Button onClick={onRefreshClasses} size="sm" variant="ghost">
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-0">
            <ScrollArea className="h-[calc(100vh-260px)]">
              <div className="space-y-1">
                {loading ? (
                  [...Array(3)].map((_, i) => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)
                ) : (
                  [...classes].sort((a, b) => a.class.localeCompare(b.class)).map((cls) => (
                    <div key={cls.class} className="flex items-center justify-between">
                      <Button
                        onClick={() => onClassSelect(cls.class)}
                        variant={selectedClass === cls.class ? "default" : "ghost"}
                        size="sm"
                        className="flex-1 justify-start text-sm"
                      >
                        {cls.class}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => onClassSelect(cls.class)}>
                            <Eye className="h-4 w-4 mr-2" /> View Objects
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete {cls.class}?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteClass(cls.class)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Objects Panel */}
      <div className="flex-1 min-w-0">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">
                  {selectedClass ? `${selectedClass}` : `Select a ${dbType === 'weaviate' ? 'class' : 'collection'}`}
                </CardTitle>
                {selectedClass && <Badge variant="secondary">{pagination.totalItems} objects</Badge>}
              </div>
              <div className="flex items-center space-x-2">
                {selectedClass && pagination.totalPages > 1 && (
                  <div className="flex items-center space-x-1 mr-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={pagination.currentPage === 1}>
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1 mx-1">
                      <Input 
                        className="h-8 w-16 text-center px-1" 
                        value={pageInput} 
                        onChange={handlePageInputChange}
                        onKeyDown={handlePageInputKeyDown}
                        onBlur={handlePageInputSubmit}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">/ {pagination.totalPages}</span>
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(pagination.totalPages)} disabled={pagination.currentPage === pagination.totalPages}>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {selectedObjects.size > 0 && (
                  <Button onClick={onBulkDelete} variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" /> Delete ({selectedObjects.size})
                  </Button>
                )}
                <div className="flex items-center space-x-1">
                  <Input
                    placeholder="Search objects..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                    className="w-48"
                  />
                  <Button onClick={onSearch} disabled={!selectedClass || isSearching} variant="outline" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                  {searchQuery && (
                    <Button onClick={onClearSearch} variant="ghost" size="sm">Clear</Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-0 flex-1 flex flex-col min-h-0">
            {selectedClass ? (
              <>
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[calc(100vh-250px)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              checked={selectedObjects.size === objects.length && objects.length > 0}
                              onChange={(e) => onSelectAll(e.target.checked)}
                            />
                          </TableHead>
                          <TableHead>Properties</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {objects.map((obj, index) => (
                          <TableRow key={obj.id || index}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedObjects.has(obj.id)}
                                onChange={() => onToggleSelection(obj.id)}
                              />
                            </TableCell>
                            <TableCell 
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => onViewObject(obj)}
                            >
                              <div className="text-sm bg-muted p-4 rounded w-full">
                                <pre className="whitespace-pre-wrap text-smbreak-all">
                                  {searchQuery ? 
                                    highlightSearchText(formatObjectProperties(obj.properties), searchQuery) :
                                    formatObjectProperties(obj.properties)
                                  }
                                </pre>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground flex-1 flex items-center justify-center">
                <div>
                  <Database className="mx-auto h-12 w-12 mb-4" />
                  <p>Select a {dbType === 'weaviate' ? 'class' : 'collection'} to view objects</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
