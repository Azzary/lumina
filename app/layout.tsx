import "./globals.css";

import { MediaModalProvider } from "@/app/components/Modal/MediaModalContext/MediaModalContext";
import MediaModalHost from "@/app/models/MediaModalHost/MediaModalHost";

import { SearchProvider } from "./Search/SearchContext";
import SearchOverlay from "./Search/SearchOverlay";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <SearchProvider>
          <MediaModalProvider>
            {children}

            {}
            <MediaModalHost />
            <SearchOverlay />
          </MediaModalProvider>
        </SearchProvider>
      </body>
    </html>
  );
}
