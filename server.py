from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)
SCORE_FILE = 'scores.json'

def load_scores():
    if not os.path.exists(SCORE_FILE):
        return []
    with open(SCORE_FILE, 'r') as f:
        return json.load(f)

def save_scores(scores):
    with open(SCORE_FILE, 'w') as f:
        json.dump(scores, f)

@app.route('/submit_score', methods=['POST'])
def submit_score():
    data = request.json
    name = data.get('name', 'anonymous')
    score = data.get('score', 0)
    scores = load_scores()
    scores.append({'name': name, 'score': score})
    scores = sorted(scores, key=lambda x: x['score'], reverse=True)[:10]  # 상위 10명만 저장
    save_scores(scores)
    return jsonify({'result': 'success'})

@app.route('/ranking', methods=['GET'])
def ranking():
    scores = load_scores()
    return jsonify(scores)

if __name__ == '__main__':
    app.run(debug=True)
