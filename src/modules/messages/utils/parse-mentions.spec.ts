import { parseMentions } from './parse-mentions';

describe('parseMentions', () => {
  it('should extract an @everyone mention', () => {
    expect(parseMentions('hello @everyone')).toEqual([{ type: 'everyone' }]);
  });

  it('should treat @everyone case-insensitively', () => {
    expect(parseMentions('hello @EVERYONE')).toEqual([{ type: 'everyone' }]);
  });

  it('should extract a role mention using the role: prefix', () => {
    expect(parseMentions('ping @role:moderators')).toEqual([
      { type: 'role', name: 'moderators' },
    ]);
  });

  it('should extract plain member mentions', () => {
    expect(parseMentions('hi @alice and @bob')).toEqual([
      { type: 'member', name: 'alice' },
      { type: 'member', name: 'bob' },
    ]);
  });

  it('should handle multiple distinct mention types together', () => {
    expect(parseMentions('@everyone read @role:dev @alice')).toEqual([
      { type: 'everyone' },
      { type: 'role', name: 'dev' },
      { type: 'member', name: 'alice' },
    ]);
  });

  it('should strip trailing punctuation from a mention', () => {
    expect(parseMentions('hi @alice, how are you?')).toEqual([
      { type: 'member', name: 'alice' },
    ]);
  });

  it('should extract a member token from an email-like address', () => {
    expect(parseMentions('contact foo@example.com')).toEqual([
      { type: 'member', name: 'example.com' },
    ]);
  });

  it('should return no tokens for empty content', () => {
    expect(parseMentions('')).toEqual([]);
  });
});
