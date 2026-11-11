import urllib.request
import json
import time

def run():
    print("=== Testing Dialogue Mode Episode Generation End-to-End ===")
    dialogue_story = (
        "The Ministry of Electronics and Information Technology in New Delhi announced a new $1 billion "
        "semiconductor design fund today. Top Indian startups and research centers at IIT Bombay will receive "
        "compute credits and tape-out subsidies. The goal is to build indigenous RISC-V processors for consumer devices "
        "by 2026 (up 40% from original projections)."
    )

    payload = json.dumps({
        "title": "India Semiconductor Breakthrough",
        "source_mode": "text",
        "article_text": dialogue_story,
        "format": "dialogue",
        "voice_a": "en-IN-NeerjaNeural",
        "voice_b": "en-IN-PrabhatNeural",
        "include_music": True,
        "tone": "professional",
        "host_style": "conversational"
    }).encode("utf-8")

    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/episodes/generate",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    res = json.loads(urllib.request.urlopen(req).read().decode())
    ep_id = res["id"]
    print(f"Triggered Dialogue Episode ID: {ep_id}")

    # Poll status
    max_wait = 90
    start = time.time()
    completed = False
    while time.time() - start < max_wait:
        ep_check = json.loads(urllib.request.urlopen(f"http://127.0.0.1:8000/api/episodes/{ep_id}").read().decode())
        status = ep_check["status"]
        print(f"  Status: {status} ({int(time.time() - start)}s elapsed)")
        if status == "completed":
            completed = True
            print("\nDialogue episode generation succeeded!")
            print(f"Episode ID: {ep_check['id']}")
            print(f"Title: {ep_check['title']}")
            print(f"Audio URL: {ep_check['audio_url']}")
            print(f"\n--- SCRIPT PREVIEW ---\n{ep_check['script']}")
            assert "Host A:" in ep_check["script"] or "Host B:" in ep_check["script"]

            # Verify audio file
            audio_url = f"http://127.0.0.1:8000{ep_check['audio_url']}"
            audio_data = urllib.request.urlopen(audio_url).read()
            print(f"\nAudio File Verified: {len(audio_data)} bytes")
            assert len(audio_data) > 10000
            break
        elif status == "failed":
            print(f"FAILED: {ep_check.get('error_message')}")
            break
        time.sleep(3)

    assert completed, "Dialogue episode generation failed or timed out"
    print("\nALL DIALOGUE E2E TESTS PASSED!")

if __name__ == "__main__":
    run()

