import urllib.request
import sys
import ssl

def download_video():
    print("Initializing video download from Archive.org...")
    ssl_context = ssl._create_unverified_context()
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    # Public domain tea/warm water pouring morning ritual video loop on Archive.org
    url = "https://archive.org/download/warm-lemon-water-in-the-morning-mindful-morning-ritual/warm-lemon-water-in-the-morning-mindful-morning-ritual.mp4"
    
    try:
        print(f"Connecting to: {url}")
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ssl_context) as response:
            print("Connection successful! Downloading and saving vura-hero-loop.mp4...")
            with open("assets/vura-hero-loop.mp4", "wb") as f:
                while True:
                    chunk = response.read(65536) # 64KB chunks
                    if not chunk:
                        break
                    f.write(chunk)
        print("Success! Video downloaded and saved as assets/vura-hero-loop.mp4")
        return
    except Exception as e:
        print(f"Failed to download. Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    download_video()
