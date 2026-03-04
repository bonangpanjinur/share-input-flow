import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Photo {
  id: string;
  url: string;
  photo_type: string;
}

interface PhotoGalleryProps {
  entryId: string;
  legacyProdukUrl?: string | null;
  legacyVerifikasiUrl?: string | null;
  photoType?: "produk" | "verifikasi" | "all";
  trigger: React.ReactNode;
}

export default function PhotoGallery({ entryId, legacyProdukUrl, legacyVerifikasiUrl, photoType = "all", trigger }: PhotoGalleryProps) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const imgContainerRef = useRef<HTMLDivElement>(null);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!open) return;
    const fetchPhotos = async () => {
      setLoading(true);
      let query = supabase.from("entry_photos" as any).select("id, url, photo_type").eq("entry_id", entryId);
      if (photoType !== "all") {
        query = query.eq("photo_type", photoType);
      }
      const { data } = await query.order("created_at", { ascending: true });
      const result: Photo[] = (data ?? []) as any;

      if (photoType === "all" || photoType === "produk") {
        if (!result.some(p => p.photo_type === "produk") && legacyProdukUrl) {
          result.push({ id: "legacy-produk", url: legacyProdukUrl, photo_type: "produk" });
        }
      }
      if (photoType === "all" || photoType === "verifikasi") {
        if (!result.some(p => p.photo_type === "verifikasi") && legacyVerifikasiUrl) {
          result.push({ id: "legacy-verifikasi", url: legacyVerifikasiUrl, photo_type: "verifikasi" });
        }
      }

      setPhotos(result);
      setCurrentIndex(0);
      resetZoom();
      setLoading(false);
    };
    fetchPhotos();
  }, [open, entryId, photoType, legacyProdukUrl, legacyVerifikasiUrl, resetZoom]);

  const navigate = useCallback((dir: 1 | -1) => {
    setCurrentIndex(i => Math.max(0, Math.min(i + dir, photos.length - 1)));
    resetZoom();
  }, [photos.length, resetZoom]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.5, 5));
  const handleZoomOut = () => {
    setZoom(z => {
      const next = Math.max(z - 0.5, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom(z => Math.min(z + 0.25, 5));
    } else {
      setZoom(z => {
        const next = Math.max(z - 0.25, 1);
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  }, []);

  const handleDoubleClick = () => {
    if (zoom > 1) resetZoom();
    else setZoom(2.5);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPan({
      x: panStart.current.x + (e.clientX - dragStart.current.x),
      y: panStart.current.y + (e.clientY - dragStart.current.y),
    });
  };

  const handlePointerUp = () => setDragging(false);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navigate(-1);
      else if (e.key === "ArrowRight") navigate(1);
      else if (e.key === "+" || e.key === "=") handleZoomIn();
      else if (e.key === "-") handleZoomOut();
      else if (e.key === "0") resetZoom();
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, navigate, resetZoom]);

  return (
    <>
      <span className="cursor-pointer" onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[92vw] max-h-[92vh] p-0 border-none bg-transparent shadow-none [&>button]:hidden">
          <div className="relative flex flex-col items-center justify-center">
            {/* Top controls */}
            <div className="absolute right-2 top-2 z-10 flex gap-1">
              {photos.length > 0 && (
                <>
                  <Button variant="secondary" size="icon" className="rounded-full bg-background/80 backdrop-blur-sm" onClick={handleZoomOut} disabled={zoom <= 1}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="icon" className="rounded-full bg-background/80 backdrop-blur-sm" onClick={handleZoomIn} disabled={zoom >= 5}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  {zoom > 1 && (
                    <Button variant="secondary" size="icon" className="rounded-full bg-background/80 backdrop-blur-sm" onClick={resetZoom}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </>
              )}
              <Button variant="secondary" size="icon" className="rounded-full bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <ImageIcon className="h-8 w-8 animate-pulse text-muted-foreground" />
              </div>
            ) : photos.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Tidak ada foto
              </div>
            ) : (
              <>
                <div
                  ref={imgContainerRef}
                  className="overflow-hidden rounded-lg"
                  style={{ maxHeight: "78vh", maxWidth: "88vw", cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
                  onWheel={handleWheel}
                  onDoubleClick={handleDoubleClick}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <img
                    src={photos[currentIndex].url}
                    alt={`Foto ${currentIndex + 1}`}
                    className="max-h-[78vh] max-w-[88vw] object-contain select-none"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                      transition: dragging ? "none" : "transform 0.2s ease",
                    }}
                    draggable={false}
                  />
                </div>

                {zoom > 1 && (
                  <span className="absolute left-2 top-2 text-xs bg-background/80 backdrop-blur-sm text-foreground rounded-full px-2 py-1">
                    {Math.round(zoom * 100)}%
                  </span>
                )}

                <div className="flex items-center gap-3 mt-3">
                  <Button variant="secondary" size="icon" className="rounded-full" onClick={() => navigate(-1)} disabled={currentIndex === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <Badge variant={photos[currentIndex].photo_type === "produk" ? "default" : "secondary"}>
                      {photos[currentIndex].photo_type === "produk" ? "Produk" : "Verifikasi"}
                    </Badge>
                    <span className="text-sm text-white/80">{currentIndex + 1} / {photos.length}</span>
                  </div>
                  <Button variant="secondary" size="icon" className="rounded-full" onClick={() => navigate(1)} disabled={currentIndex === photos.length - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {photos.length > 1 && (
                  <div className="flex gap-1.5 mt-2 overflow-x-auto max-w-[88vw] pb-1">
                    {photos.map((p, i) => (
                      <img
                        key={p.id}
                        src={p.url}
                        alt={`Thumbnail ${i + 1}`}
                        className={`h-12 w-12 rounded object-cover cursor-pointer border-2 transition-all ${
                          i === currentIndex ? "border-primary opacity-100" : "border-transparent opacity-60 hover:opacity-80"
                        }`}
                        onClick={() => { setCurrentIndex(i); resetZoom(); }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
