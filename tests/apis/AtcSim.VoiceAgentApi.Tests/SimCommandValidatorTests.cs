using AtcSim.VoiceAgentApi.Contracts;
using AtcSim.VoiceAgentApi.Services;
using Xunit;

namespace AtcSim.VoiceAgentApi.Tests;

public class SimCommandValidatorTests
{
    private static SimCommand Cmd(string type, params (string, double)[] p)
        => new(type, p.ToDictionary(x => x.Item1, x => x.Item2));

    [Fact]
    public void Accepts_valid_heading()
    {
        var r = new SimCommandValidator().Validate(Cmd("SET_HEADING", ("heading", 270)));
        Assert.True(r.Accepted);
    }

    [Fact]
    public void Rejects_out_of_range_heading()
    {
        var r = new SimCommandValidator().Validate(Cmd("SET_HEADING", ("heading", 400)));
        Assert.False(r.Accepted);
        Assert.Contains("heading", r.Reason);
    }

    [Fact]
    public void Rejects_unknown_command()
    {
        var r = new SimCommandValidator().Validate(Cmd("LAUNCH_MISSILE"));
        Assert.False(r.Accepted);
    }

    [Fact]
    public void Rejects_missing_parameter()
    {
        var r = new SimCommandValidator().Validate(Cmd("SET_HEADING"));
        Assert.False(r.Accepted);
    }
}
