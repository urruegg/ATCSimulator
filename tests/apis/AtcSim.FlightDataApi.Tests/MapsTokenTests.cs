using AtcSim.FlightDataApi.Services;
using Azure.Core;
using Xunit;

namespace AtcSim.FlightDataApi.Tests;

public class MapsTokenTests
{
    [Fact]
    public async Task GetTokenAsync_returns_token_from_credential()
    {
        var service = new MapsTokenService(new StubCredential());

        var token = await service.GetTokenAsync(default);

        Assert.Equal("test-token", token);
    }

    [Fact]
    public void BoundingBox_returns_box_for_known_airport()
    {
        Assert.Equal("47.7,47.2,8.3,8.8", Airports.BoundingBox("ZRH"));
    }

    [Fact]
    public void BoundingBox_throws_for_unknown_airport()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Airports.BoundingBox("XXX"));
    }

    private sealed class StubCredential : TokenCredential
    {
        public override AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken)
            => new("test-token", DateTimeOffset.UtcNow.AddHours(1));

        public override ValueTask<AccessToken> GetTokenAsync(TokenRequestContext requestContext, CancellationToken cancellationToken)
            => new(GetToken(requestContext, cancellationToken));
    }
}
