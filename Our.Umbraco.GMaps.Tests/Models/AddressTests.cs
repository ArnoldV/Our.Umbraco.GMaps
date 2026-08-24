using Our.Umbraco.GMaps.Models;

namespace Our.Umbraco.GMaps.Tests.Models;

public class AddressTests
{
    [Fact]
    public void Renders_the_full_address_when_one_is_stored()
    {
        var address = new Address
        {
            FullAddress = "88 Dock Rd, Port Melbourne VIC 3207, Australia",
            StreetNumber = "88",
            Street = "Dock Rd"
        };

        Assert.Equal("88 Dock Rd, Port Melbourne VIC 3207, Australia", $"{address}");
    }

    [Fact]
    public void Composes_the_address_from_its_parts_when_no_full_address_is_stored()
    {
        var address = new Address
        {
            StreetNumber = "88",
            Street = "Dock Rd",
            City = "Port Melbourne",
            State = "Victoria",
            PostalCode = "3207",
            Country = "Australia"
        };

        Assert.Equal("88 Dock Rd, Port Melbourne, Victoria 3207, Australia", $"{address}");
    }

    [Fact]
    public void Skips_the_parts_that_are_missing()
    {
        var address = new Address
        {
            Street = "Dock Rd",
            Country = "Australia"
        };

        Assert.Equal("Dock Rd, Australia", $"{address}");
    }

    [Fact]
    public void Renders_an_empty_string_for_an_empty_address()
    {
        Assert.Equal(string.Empty, $"{new Address()}");
    }

    [Fact]
    public void Ignores_whitespace_only_parts()
    {
        var address = new Address
        {
            FullAddress = "   ",
            Street = "Dock Rd",
            City = " ",
            Country = "Australia"
        };

        Assert.Equal("Dock Rd, Australia", $"{address}");
    }
}
