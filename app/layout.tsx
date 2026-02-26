import "./globals.css";

import { MediaModalProvider } from "@/app/components/Modal/MediaModalContext/MediaModalContext";
import MediaModalHost from "@/app/models/MediaModalHost/MediaModalHost";
import UserGate from "@/app/components/UserGate/UserGate";

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
        <UserGate>
          <SearchProvider>
            <MediaModalProvider>
              {children}
              <MediaModalHost />
              <SearchOverlay />
            </MediaModalProvider>
          </SearchProvider>
        </UserGate>
      </body>
    </html>
  );
}
