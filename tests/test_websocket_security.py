"""Exercise real endpoint bodies with mock AI calls; never connect to Google."""
import ast
import asyncio
import json
import logging
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CHAPTERS = [str(p.relative_to(ROOT)) for p in ROOT.glob('*/backend/main*.py') if 'def websocket_endpoint' in p.read_text(encoding='utf-8')]

class Disconnect(Exception):
    pass

class Socket:
    def __init__(self, messages):
        self.messages = iter(messages)
        self.sent = []
    async def accept(self):
        pass
    async def receive_text(self):
        try:
            return next(self.messages)
        except StopIteration:
            raise Disconnect()
    async def send_text(self, message):
        self.sent.append(json.loads(message))

def endpoint(chapter, workflow):
    tree = ast.parse((ROOT / chapter).read_text(encoding='utf-8'))
    names = {'parse_client_message', 'websocket_endpoint'}
    nodes = []
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names:
            node.decorator_list = []
            nodes.append(node)
        elif isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id.startswith('MAX_') for t in node.targets):
            nodes.append(node)
    namespace = {'json': json, 'WebSocket': Socket, 'WebSocketDisconnect': Disconnect,
                 'logger': logging.getLogger('security-test'), 'run_two_agent_workflow': workflow, 'run_new_agent_workflow': workflow}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), chapter, 'exec'), namespace)
    return namespace['websocket_endpoint']

class SecurityTests(unittest.IsolatedAsyncioTestCase):
    async def test_invalid_inputs_never_reach_paid_workflow(self):
        for chapter in CHAPTERS:
            with self.subTest(chapter=chapter):
                calls = []
                async def workflow(*args): calls.append(args)
                messages = ['{', 'null', '[]', json.dumps({'type':'generate_story','data':[]}),
                    json.dumps({'type':'generate_story','data':' '}),
                    json.dumps({'type':'generate_story','data':'x'*2001}),
                    json.dumps({'type':'generate_story','data':'ok','extra':'x'*16384}),
                    json.dumps({'type':'unknown'}), '['*1001+']'*1001]
                sock = Socket(messages)
                await endpoint(chapter, workflow)(sock, 'test-user')
                self.assertEqual(calls, [])
                self.assertEqual(sum(m['type']=='error' for m in sock.sent), len(messages))

    async def test_valid_story_and_ping_still_work(self):
        for chapter in CHAPTERS:
            calls=[]
            async def workflow(_sock, _user, data): calls.append(data)
            sock=Socket([json.dumps({'type':'generate_story','data':'  cat and moon  '}), json.dumps({'type':'ping'})])
            await endpoint(chapter, workflow)(sock, 'test-user')
            self.assertEqual(calls, ['cat and moon'])
            self.assertIn({'type':'pong'}, sock.sent)

    async def test_provider_error_details_do_not_reach_client(self):
        for chapter in CHAPTERS:
            async def workflow(*_args): raise RuntimeError('private-provider-sentinel')
            sock=Socket([json.dumps({'type':'generate_story','data':'cat and moon'})])
            with self.assertLogs('security-test', level='ERROR'):
                await endpoint(chapter, workflow)(sock, 'test-user')
            self.assertNotIn('private-provider-sentinel', json.dumps(sock.sent))
            self.assertTrue(any(m['type']=='error' for m in sock.sent))

if __name__ == '__main__':
    unittest.main()
