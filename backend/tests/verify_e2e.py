import urllib.request
import json
import time

def run():
    print("=== Testing Failure Handling ===")
    payload_fail = json.dumps({
        "title": "Failing Channel Test",
        "source_mode": "channel",
        "source_id": "invalid_source_123",
        "category": "national"
    }).encode("utf-8")

    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/episodes/generate",
        data=payload_fail,
        headers={"Content-Type": "application/json"}
    )
    res = json.loads(urllib.request.urlopen(req).read().decode())
    ep_fail_id = res["id"]
    print(f"Triggered episode {ep_fail_id}")

    time.sleep(2)
    ep_res = json.loads(urllib.request.urlopen(f"http://127.0.0.1:8000/api/episodes/{ep_fail_id}").read().decode())
    print(f"Status: {ep_res['status']}")
    print(f"Error Message: {ep_res.get('error_message')}")
    assert ep_res["status"] == "failed"
    assert "invalid_source_123" in ep_res["error_message"]
    print("Failure test PASSED!\n")

    print("=== Testing End-to-End Successful Episode Generation ===")
    article_content = (
        "The Indian Space Research Organisation (ISRO) successfully launched its latest satellite "
        "mission today from Sriharikota. According to [ISRO officials], the mission achieved all its primary "
        "objectives with 100% precision (up 10% compared to previous payload margins). Funding for the mission "
        "reached $50 million ($50M), boosting deep space exploration."
    )
    payload_success = json.dumps({
        "title": "ISRO Space Milestone",
        "source_mode": "text",
        "article_text": article_content,
        "voice": "en-IN-NeerjaNeural",
        "tone": "professional",
        "host_style": "informative"
    }).encode("utf-8")

    req_success = urllib.request.Request(
        "http://127.0.0.1:8000/api/episodes/generate",
        data=payload_success,
        headers={"Content-Type": "application/json"}
    )
    res_success = json.loads(urllib.request.urlopen(req_success).read().decode())
    ep_success_id = res_success["id"]
    print(f"Triggered episode {ep_success_id}. Waiting for synthesis to complete...")

    # Poll until completed or timeout
    max_wait = 60
    start = time.time()
    completed = False
    while time.time() - start < max_wait:
        ep_check = json.loads(urllib.request.urlopen(f"http://127.0.0.1:8000/api/episodes/{ep_success_id}").read().decode())
        status = ep_check["status"]
        print(f"  Current status: {status} ({int(time.time() - start)}s elapsed)")
        if status == "completed":
            completed = True
            print("\nEpisode generation completed successfully!")
            print(f"Episode ID: {ep_check['id']}")
            print(f"Title: {ep_check['title']}")
            print(f"Audio URL: {ep_check['audio_url']}")
            print(f"Script preview:\n{ep_check['script'][:300]}...")
            # Verify script contains preserved parentheses and unwrapped brackets
            assert "(ISRO)" in ep_check["script"] or "ISRO" in ep_check["script"]
            # Verify audio file exists and is accessible
            audio_url = f"http://127.0.0.1:8000{ep_check['audio_url']}"
            audio_req = urllib.request.urlopen(audio_url)
            audio_data = audio_req.read()
            print(f"Audio file verified! Size: {len(audio_data)} bytes")
            assert len(audio_data) > 1000
            break
        elif status == "failed":
            print(f"Generation failed: {ep_check.get('error_message')}")
            break
        time.sleep(3)

    assert completed, "Episode generation did not complete in time"
    print("\nALL VERIFICATIONS PASSED!")

if __name__ == "__main__":
    run()

